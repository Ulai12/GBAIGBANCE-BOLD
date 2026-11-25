import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams, useNavigationType, Navigate } from 'react-router-dom';
import { unlockDocumentScroll } from '@/utils/scrollUnlock';
import { safeNavigateBack, getSafeInternalPath } from '@/utils/navigation';
import { canManageEvents } from '@/security/rbac';
import { CreatorAccessRoute } from '@/navigation/CreatorAccessRoute';
import { UnauthorizedCreateGate } from '@/components/UnauthorizedCreateGate';
import { BookingModal } from '@/components/BookingModal';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { EdgeSwipeBack } from '@/components/EdgeSwipeBack';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AppLoadingScreen } from '@/components/Skeleton';
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
  const state = location.state as { email?: string; phone?: string; returnTo?: string } | undefined;
  const email = state?.email || user?.email || undefined;
  const phone = state?.phone || undefined;

  return (
    <OtpScreen
      email={email}
      phone={phone}
      onBack={() => safeNavigateBack(navigate, { fallback: '/login' })}
      onVerify={() => navigate(getSafeInternalPath(state?.returnTo, '/'), { replace: true })}
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
    // Les billets comptabilisés comme valides/actifs sont ceux ayant le statut 'valid' ou 'pending'
    return cached.filter((t) => t.status === 'valid' || t.status === 'pending').length;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Synchronisation en temps réel du nombre de billets actifs pour le badge BottomNav
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

  const canCreate = !!(session && user && canManageEvents(user.role));

  // Determine active tab based on current pathname
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

  // Enregistrement continu de la position de défilement par écran
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



  // Retour arrière intelligent : utilise l'historique interne React Router s'il existe, sinon redirige vers la route de repli
  const handleSmartBack = useCallback((fallbackPath: string = '/') => {
    safeNavigateBack(navigate, { fallback: fallbackPath });
  }, [navigate]);

  // Un lien cadeau #claim=… doit ouvrir Mes billets, même s'il est collé sur une autre page.
  useEffect(() => {
    const hash = location.hash || '';
    if (hash.includes('claim=') && location.pathname !== '/tickets') {
      navigate({ pathname: '/tickets', hash }, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  // Support legacy ?event= query param deep linking
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (eventParam) {
      navigate(`/events/${eventParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Handle first-time onboarding check
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

  // Confirmation après l'application d'une nouvelle version PWA.
  useEffect(() => {
    const updateFlag = 'gbaigbance:pwa-update-complete';

    try {
      if (window.sessionStorage.getItem(updateFlag) === '1') {
        window.sessionStorage.removeItem(updateFlag);
        addToast({
          message: t('settings', 'pwa.updateComplete'),
          type: 'success',
        });
      }
    } catch {
      // Le stockage de session peut être indisponible en navigation privée.
    }

    const handleUpdate = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<{ update?: () => Promise<void> | void }>;
      const applyUpdate = customEvent.detail?.update;

      addToast({
        message: t('settings', 'pwa.updateAvailable'),
        type: 'info',
        persistent: true,
        action: applyUpdate
          ? {
              label: t('settings', 'pwa.updateNow'),
              onClick: () => {
                try {
                  window.sessionStorage.setItem(updateFlag, '1');
                } catch {
                  // La mise à jour reste possible même sans stockage de session.
                }

                void Promise.resolve(applyUpdate()).catch((error: unknown) => {
                  try {
                    window.sessionStorage.removeItem(updateFlag);
                  } catch {
                    // Ignore les restrictions de stockage.
                  }
                  console.error('[PWA] Impossible d’appliquer la mise à jour.', error);
                  addToast({
                    message: t('settings', 'pwa.updateFailed'),
                    type: 'error',
                  });
                });
              },
            }
          : undefined,
      });
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, [addToast, t]);

  // Écouteur in-app pour les notifications Web Push PWA (rappels 24h/2h, alertes artistes)
  useEffect(() => {
    const handleInAppPush = (e: globalThis.Event) => {
      const custom = e as CustomEvent<{ title: string; body: string }>;
      if (custom.detail?.title && custom.detail?.body) {
        addToast({
          message: `${custom.detail.title} — ${custom.detail.body}`,
          type: 'info',
        });
      }
    };
    window.addEventListener('gba-inapp-push-received', handleInAppPush);
    return () => window.removeEventListener('gba-inapp-push-received', handleInAppPush);
  }, [addToast]);

  // Surveillance et déclenchement automatique des rappels 24h et 2h pour les événements réservés
  useEffect(() => {
    if (!user?.id) return;

    // Vérification initiale
    checkAndTriggerTicketReminders(user.id);

    // Vérification périodique toutes les 15 minutes
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkAndTriggerTicketReminders(user.id);
      }
    }, 15 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [user?.id]);

  // Global toast and rollback event listeners
  useEffect(() => {
    const handleToastEvent = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<Omit<ToastData, 'id'>>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    const handleRollbackEvent = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      if (customEvent.detail?.message) {
        addToast({
          message: customEvent.detail.message,
          type: 'error',
        });
      }
    };

    window.addEventListener('gba-toast', handleToastEvent);
    window.addEventListener('gba-optimistic-rollback', handleRollbackEvent);
    return () => {
      window.removeEventListener('gba-toast', handleToastEvent);
      window.removeEventListener('gba-optimistic-rollback', handleRollbackEvent);
    };
  }, [addToast]);

  const handleEventClick = (event: Event) => {
    navigateVT(`/events/${event.id}`, { state: { event } });
  };

  const handleArtistClick = (artist: Artist) => {
    navigateVT(`/artists/${artist.id}`, { state: { artist } });
  };

  const handleOrganizationClick = (org: Organization) => {
    navigateVT(`/organizers/${org.id}`, { state: { organization: org } });
  };

  const handleBookEvent = useCallback((event: Event, initialOptionId?: string | null) => {
    // Une billetterie externe appartient à l'organisateur : elle ne passe ni par
    // l'authentification GBAIGBANCE ni par le tunnel de paiement interne.
    if (event.access_type === 'external' || Boolean(event.external_ticket_url?.trim())) {
      const externalUrl = event.external_ticket_url?.trim();

      if (!externalUrl) {
        addToast({ message: "Le lien de billetterie de cet événement n'est pas disponible.", type: 'error' });
        return;
      }

      try {
        const normalizedUrl = /^[a-z][a-z0-9+.-]*:/i.test(externalUrl)
          ? externalUrl
          : `https://${externalUrl}`;
        const destination = new URL(normalizedUrl);
        if (destination.protocol !== 'https:' && destination.protocol !== 'http:') {
          throw new Error('Unsupported external URL protocol');
        }

        // Navigation dans l'onglet courant : pas de popup bloquée sur mobile/PWA.
        window.location.assign(destination.toString());
      } catch {
        addToast({ message: "Le lien de billetterie fourni par l'organisateur est invalide.", type: 'error' });
      }
      return;
    }

    if (!session) {
      addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
      navigate('/login', {
        state: { returnTo: location.pathname, pendingBooking: { event, initialOptionId: initialOptionId || null } },
      });
      return;
    }
    setBookingInitialOptionId(initialOptionId || null);
    setBookingEvent(event);
  }, [session, addToast, navigate, location.pathname]);

  const handleAuthSuccess = () => {
    const authState = location.state as {
      returnTo?: string;
      pendingBooking?: { event: Event; initialOptionId?: string | null };
    } | null;
    const pendingBooking = authState?.pendingBooking;

    if (pendingBooking?.event) {
      setBookingInitialOptionId(pendingBooking.initialOptionId || null);
      setBookingEvent(pendingBooking.event);
      navigate(getSafeInternalPath(authState?.returnTo, `/events/${pendingBooking.event.id}`), {
        replace: true,
        state: { event: pendingBooking.event },
      });
      return;
    }

    navigate(getSafeInternalPath(authState?.returnTo, '/'), { replace: true });
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'home') navigateVT('/');
    else navigateVT(`/${tab}`);
  };

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <>
      <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent">
        {isTabScreen ? (
          <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] max-w-7xl mx-auto">
            {(visitedTabs.has('home') || activeTab === 'home') && (
              <div className={activeTab === 'home' ? 'block' : 'hidden'}>
                <Suspense fallback={<TabLoadingFallback />}>
                  <HomeScreen
                    onEventClick={handleEventClick}
                    onBookEvent={handleBookEvent}
                    onSearchClick={() => navigate('/explore')}
                    onOpenNotifications={() => navigate('/notifications')}
                    onProfileClick={() => navigate('/profile')}
                    onArtistClick={handleArtistClick}
                    onOrganizationClick={handleOrganizationClick}
                    onOpenAIAssistant={() => setAiAssistantOpen(true)}
                    onOpenAISettings={() => navigate('/ai-settings')}
                    onOpenSettings={() => setSettingsModalOpen(true)}
                    onToast={addToast}
                  />
                </Suspense>
              </div>
            )}
            {(visitedTabs.has('explore') || activeTab === 'explore') && (
              <div className={activeTab === 'explore' ? 'block' : 'hidden'}>
                <Suspense fallback={<TabLoadingFallback />}>
                  <ExploreScreen
                    onEventClick={handleEventClick}
                    onUserClick={(u) => navigate(`/users/${u.id}`)}
                  />
                </Suspense>
              </div>
            )}
            {(visitedTabs.has('tickets') || activeTab === 'tickets') && (
              <div className={activeTab === 'tickets' ? 'block' : 'hidden'}>
                <Suspense fallback={<TabLoadingFallback />}>
                  <TicketsScreen
                    onEventClick={handleEventClick}
                    onLogin={() => navigate('/login')}
                    onToast={addToast}
                  />
                </Suspense>
              </div>
            )}
            {(visitedTabs.has('favorites') || activeTab === 'favorites') && (
              <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
                <Suspense fallback={<TabLoadingFallback />}>
                  <FavoritesScreen
                    onEventClick={handleEventClick}
                    onLogin={() => navigate('/login')}
                    onArtistClick={handleArtistClick}
                    onOrganizationClick={handleOrganizationClick}
                    onUserClick={(profile) => navigate(`/users/${profile.id}`, { state: { profile } })}
                  />
                </Suspense>
              </div>
            )}
            {(visitedTabs.has('profile') || activeTab === 'profile') && (
              <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                <Suspense fallback={<TabLoadingFallback />}>
                  <ProfileScreen
                    onEventClick={handleEventClick}
                    onLogin={() => navigate('/login')}
                    onOrganizerDashboard={() => navigate('/organizer/dashboard')}
                    onOpenNotifications={() => navigate('/notifications')}
                    onOpenNotificationSettings={() => navigate('/notifications/settings')}
                    onOpenSubscriptions={(tab) => navigate(tab ? `/subscriptions?tab=${tab}` : '/subscriptions')}
                    onOpenTickets={() => navigate('/tickets')}
                    onOpenAISettings={() => navigate('/ai-settings')}
                    onToast={addToast}
                  />
                </Suspense>
              </div>
            )}
          </div>
        ) : (
          <Routes>
            <Route
              path="/onboarding"
              element={
                <OnboardingScreen
                  onComplete={() => {
                    try {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('gbaigbance_onboarding_completed', 'true');
                      }
                    } catch {
                      // Ignore
                    }
                    navigate('/');
                  }}
                />
              }
            />
            <Route
              path="/login"
              element={
                <AuthScreen
                  mode="login"
                  onSuccess={handleAuthSuccess}
                  onGuestContinue={() => {
                    const authState = location.state as { returnTo?: string } | null;
                    navigate(getSafeInternalPath(authState?.returnTo, '/'), { replace: true });
                  }}
                  onToggleMode={() => navigate('/signup', { state: location.state })}
                  onForgotPassword={() => navigate('/forgot-password', { state: location.state })}
                  onToast={addToast}
                />
              }
            />
            <Route
              path="/signup"
              element={
                <AuthScreen
                  mode="signup"
                  onSuccess={handleAuthSuccess}
                  onGuestContinue={() => {
                    const authState = location.state as { returnTo?: string } | null;
                    navigate(getSafeInternalPath(authState?.returnTo, '/'), { replace: true });
                  }}
                  onToggleMode={() => navigate('/login', { state: location.state })}
                  onForgotPassword={() => navigate('/forgot-password', { state: location.state })}
                  onToast={addToast}
                />
              }
            />
            <Route
              path="/forgot-password"
              element={<ForgotPasswordScreen onBack={() => handleSmartBack('/login')} onToast={addToast} />}
            />
            <Route path="/otp" element={<OtpRoute />} />
            <Route
              path="/events/:id"
              element={<EventDetailRoute onToast={addToast} onBook={handleBookEvent} />}
            />
            <Route
              path="/events/:id/edit"
              element={
                <CreatorAccessRoute fallbackPath="/">
                  <EditEventRoute onToast={addToast} />
                </CreatorAccessRoute>
              }
            />
            <Route path="/artists/:id" element={<ArtistDetailRoute onToast={addToast} />} />
            <Route path="/organizers/:id" element={<OrganizerDetailRoute onToast={addToast} />} />
            <Route path="/users/:id" element={<UserProfileRoute onToast={addToast} />} />
            <Route
              path="/notifications"
              element={<NotificationsScreen onBack={() => handleSmartBack('/')} onToast={addToast} />}
            />
            <Route
              path="/notifications/settings"
              element={<NotificationSettingsScreen onBack={() => handleSmartBack('/notifications')} onToast={addToast} />}
            />
            <Route
              path="/subscriptions"
              element={
                <SubscriptionsScreen
                  onBack={() => handleSmartBack('/profile')}
                  onArtistClick={handleArtistClick}
                  onOrganizationClick={handleOrganizationClick}
                  onUserClick={(p) => navigate(`/users/${p.id}`)}
                  onLogin={() => navigate('/login')}
                />
              }
            />
            <Route
              path="/organizer/dashboard"
              element={
                <CreatorAccessRoute fallbackPath="/profile">
                  <OrganizerDashboardScreen
                    onBack={() => handleSmartBack('/profile')}
                    onEventClick={handleEventClick}
                    onEditEvent={(e) => navigate(`/events/${e.id}/edit`)}
                    onToast={addToast}
                  />
                </CreatorAccessRoute>
              }
            />
            <Route
              path="/create"
              element={
                <CreatorAccessRoute fallbackPath="/">
                  <CreateEventScreen
                    onBack={() => handleSmartBack('/')}
                    onCreated={(event) => {
                      addToast({ message: 'Événement créé avec succès !', type: 'success' });
                      navigate(`/events/${event.id}`);
                    }}
                    onToast={addToast}
                  />
                </CreatorAccessRoute>
              }
            />
            <Route
              path="/ai-settings"
              element={
                <AISettingsScreen
                  onBack={() => handleSmartBack('/')}
                  onToast={(t) => addToast({ message: t.message, type: t.type || 'info' })}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>

      {isTabScreen && (
        <BottomNav
          active={activeTab}
          onNavigate={handleTabChange}
          ticketCount={liveTicketCount}
          onCreate={() => {
            if (!session) {
              addToast({ message: 'Connectez-vous pour créer un événement', type: 'info' });
              navigate('/login', { state: { returnTo: '/create' } });
            } else {
              navigate('/create');
            }
          }}
          canCreate={canCreate}
        />
      )}

      <BookingModal
        open={!!bookingEvent}
        event={bookingEvent}
        initialOptionId={bookingInitialOptionId}
        onClose={() => {
          setBookingEvent(null);
          setBookingInitialOptionId(null);
        }}
        onSuccess={() => {
          addToast({ message: 'Billet confirmé. Retrouvez-le dans Mes billets.', type: 'success' });
          setBookingEvent(null);
          setBookingInitialOptionId(null);
          navigate('/tickets');
        }}
      />

      <AIAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        onOpenSettings={() => {
          setAiAssistantOpen(false);
          navigate('/ai-settings');
        }}
        onEventClick={(event) => {
          setAiAssistantOpen(false);
          handleEventClick(event);
        }}
        onAuthRequired={() => {
          setAiAssistantOpen(false);
          navigate('/login');
        }}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenAISettings={() => {
          setSettingsModalOpen(false);
          navigate('/ai-settings');
        }}
        onOpenNotifications={() => {
          setSettingsModalOpen(false);
          navigate('/notifications');
        }}
        onOpenNotificationSettings={() => {
          setSettingsModalOpen(false);
          navigate('/notifications/settings');
        }}
        onEditProfile={() => {
          setSettingsModalOpen(false);
          navigate('/profile');
        }}
      />

      <ToastContainer toasts={toasts} onClose={closeToast} />
      <EdgeSwipeBack />
    </>
  );
}


export { AppContent };
