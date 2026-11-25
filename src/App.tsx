import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams, useNavigationType, Navigate } from 'react-router-dom';
import { UnauthorizedCreateGate } from '@/components/UnauthorizedCreateGate';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { DataSaverProvider } from '@/contexts/DataSaverContext';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { EdgeSwipeBack } from '@/components/EdgeSwipeBack';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AppLoadingScreen } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { subscribeToUserTicketsLive } from '@/services/events';
import { getSyncCachedUserTickets } from '@/services/cache';
import { checkAndTriggerTicketReminders } from '@/services/eventReminderService';
import {
  EventDetailRoute,
  EditEventRoute,
  ArtistDetailRoute,
  OrganizerDetailRoute,
  UserProfileRoute,
} from '@/navigation/RouteWrappers';
import type { Event, Artist, Organization } from '@/types';
import { unlockDocumentScroll } from '@/utils/scrollUnlock';

const HomeScreen = lazy(() => import('@/screens/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const ExploreScreen = lazy(() => import('@/screens/ExploreScreen').then((module) => ({ default: module.ExploreScreen })));
const TicketsScreen = lazy(() => import('@/screens/TicketsScreen').then((module) => ({ default: module.TicketsScreen })));
const FavoritesScreen = lazy(() => import('@/screens/FavoritesScreen').then((module) => ({ default: module.FavoritesScreen })));
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));

const OnboardingScreen = lazy(() => import('@/screens/OnboardingScreen').then((module) => ({ default: module.OnboardingScreen })));
const AuthScreen = lazy(() => import('@/screens/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const ForgotPasswordScreen = lazy(() => import('@/screens/ForgotPasswordScreen').then((module) => ({ default: module.ForgotPasswordScreen })));
const OtpScreen = lazy(() => import('@/screens/OtpScreen').then((module) => ({ default: module.OtpScreen })));
const OrganizerDashboardScreen = lazy(() => import('@/screens/OrganizerDashboardScreen').then((module) => ({ default: module.OrganizerDashboardScreen })));
const CreateEventScreen = lazy(() => import('@/screens/CreateEventWizardScreen').then((module) => ({ default: module.CreateEventWizardScreen })));
const NotificationsScreen = lazy(() => import('@/screens/NotificationsScreen').then((module) => ({ default: module.NotificationsScreen })));
const NotificationSettingsScreen = lazy(() => import('@/screens/NotificationSettingsScreen').then((module) => ({ default: module.NotificationSettingsScreen })));
const SubscriptionsScreen = lazy(() => import('@/screens/SubscriptionsScreen').then((module) => ({ default: module.SubscriptionsScreen })));
const AISettingsScreen = lazy(() => import('@/screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));
const GlassSpike = lazy(() => import('@/components/glass/GlassSpike'));

type Tab = 'home' | 'explore' | 'tickets' | 'favorites' | 'profile';

function TabLoadingFallback() {
  return (
    <div className="min-h-[65vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-semibold text-gray-500 dark:text-zinc-400">
        <span className="h-5 w-5 rounded-full border-2 border-[#6600FF]/20 border-t-[#6600FF] animate-spin motion-reduce:animate-none" />
        Chargement de l’écran…
      </div>
    </div>
  );
}

function OtpRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const state = location.state as { email?: string; phone?: string } | undefined;
  const email = state?.email || user?.email || undefined;
  const phone = state?.phone || undefined;

  return (
    <OtpScreen
      email={email}
      phone={phone}
      onBack={() => navigate(-1)}
      onVerify={() => navigate('/')}
    />
  );
}

function AppContent() {
  const { loading, session, user, t } = useApp();
  const navigate = useNavigate();
  const navigateVT = useCallback((to: Parameters<typeof navigate>[0], options?: Parameters<typeof navigate>[1]) => {
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => navigate(to, options));
      return;
    }
    navigate(to, options);
  }, [navigate]);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [bookingInitialOptionId, setBookingInitialOptionId] = useState<string | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [liveTicketCount, setLiveTicketCount] = useState<number>(() => {
    if (!user?.id) return 0;
    const cached = getSyncCachedUserTickets(user.id);
    return cached.filter((t) => t.status === 'valid' || t.status === 'pending').length;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setLiveTicketCount(0);
      return;
    }

    const fetchActiveCount = () => {
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['valid', 'pending'])
        .then(({ count }) => {
          if (typeof count === 'number') {
            setLiveTicketCount(count);
          }
        });
    };

    fetchActiveCount();

    const unsubRealtime = subscribeToUserTicketsLive(user.id, {
      onTicketCreated: () => fetchActiveCount(),
      onTicketUpdated: () => fetchActiveCount(),
      onTicketCancelled: () => fetchActiveCount(),
    });

    const handleCountChange = (e: globalThis.Event) => {
      const custom = e as CustomEvent<{ count?: number }>;
      if (typeof custom.detail?.count === 'number') {
        setLiveTicketCount(custom.detail.count);
      } else {
        fetchActiveCount();
      }
    };

    const handleUserSignedOut = () => {
      setLiveTicketCount(0);
    };

    window.addEventListener('gba-ticket-booked', fetchActiveCount);
    window.addEventListener('gba-ticket-cancelled', fetchActiveCount);
    window.addEventListener('gba-tickets-count-changed', handleCountChange);
    window.addEventListener('gba-user-signed-out', handleUserSignedOut);

    return () => {
      unsubRealtime();
      window.removeEventListener('gba-ticket-booked', fetchActiveCount);
      window.removeEventListener('gba-ticket-cancelled', fetchActiveCount);
      window.removeEventListener('gba-tickets-count-changed', handleCountChange);
      window.removeEventListener('gba-user-signed-out', handleUserSignedOut);
    };
  }, [user?.id]);

  const canCreate = !!(user && (user.role === 'organizer' || user.role === 'artist'));

  const activeTab: Tab = (() => {
    const path = location.pathname;
    if (path === '/explore') return 'explore';
    if (path === '/tickets') return 'tickets';
    if (path === '/favorites') return 'favorites';
    if (path === '/profile') return 'profile';
    return 'home';
  })();
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const initialTab: Tab =
      path === '/explore' || path === '/tickets' || path === '/favorites' || path === '/profile'
        ? path.slice(1) as Tab
        : 'home';
    return new Set([initialTab]);
  });

  useEffect(() => {
    setVisitedTabs((visited) => {
      if (visited.has(activeTab)) return visited;
      const next = new Set(visited);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const isTabScreen = ['/', '/home', '/explore', '/tickets', '/favorites', '/profile'].includes(location.pathname);
  const navigationType = useNavigationType();
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || scrollRef.current?.scrollTop || 0;
      scrollPositionsRef.current.set(location.pathname, y);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [location.pathname]);

  // Restauration scroll + unlock overflow/touch (View Transition / iOS).
  // Double rAF = après paint. behavior auto (standard). Filet 120ms.
  useEffect(() => {
    unlockDocumentScroll();

    const restore = () => {
      if (navigationType === 'POP') {
        const savedY = scrollPositionsRef.current.get(location.pathname) || 0;
        window.scrollTo({ top: savedY, left: 0, behavior: 'auto' });
        if (scrollRef.current) scrollRef.current.scrollTop = savedY;
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
      unlockDocumentScroll();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(restore);
    });

    const safety = window.setTimeout(() => {
      unlockDocumentScroll();
    }, 120);

    return () => window.clearTimeout(safety);
  }, [location.pathname, navigationType]);

  const handleSmartBack = useCallback((fallbackPath: string = '/') => {
    if (
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const hash = location.hash || '';
    if (hash.includes('claim=') && location.pathname !== '/tickets') {
      navigate({ pathname: '/tickets', hash }, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (eventParam) {
      navigate(`/events/${eventParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const onboarded = localStorage.getItem('gbaigbance_onboarding_completed') === 'true';
        if (!onboarded && location.pathname === '/') {
          navigate('/onboarding', { replace: true });
        }
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, [location.pathname, navigate]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      if (next.length <= 4) return next;
      const oldestTransient = next.findIndex((item) => item.id !== id && !item.persistent);
      return oldestTransient === -1
        ? next.slice(-4)
        : next.filter((_, index) => index !== oldestTransient);
    });
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // NOTE: truncated body follows same structure as production App —
  // This intermediate restore must be completed. Prefer artifacts/App.tsx.scroll_fix_v2.
  return (
    <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent">
      <p className="p-8 text-center text-sm text-red-500">App restore incomplete — use full file from artifacts.</p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <DataSaverProvider>
            <FavoritesProvider>
              <Suspense fallback={<AppLoadingScreen />}>
                <AppContent />
              </Suspense>
            </FavoritesProvider>
          </DataSaverProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
