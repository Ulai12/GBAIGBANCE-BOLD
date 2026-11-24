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
import { navigateVT } from '@/utils/navigateVT';

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

// NOTE: Full App.tsx body continues in follow-up restore from artifacts/App.tsx.frontend_ia_restore
// This partial restore unblocks the build; complete file must replace this.
function AppContent() {
  const { loading, session, user, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [bookingInitialOptionId, setBookingInitialOptionId] = useState<string | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [liveTicketCount, setLiveTicketCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigationType = useNavigationType();

  const activeTab: Tab = (() => {
    const path = location.pathname;
    if (path === '/explore') return 'explore';
    if (path === '/tickets') return 'tickets';
    if (path === '/favorites') return 'favorites';
    if (path === '/profile') return 'profile';
    return 'home';
  })();

  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set([activeTab]));
  useEffect(() => {
    setVisitedTabs((v) => {
      if (v.has(activeTab)) return v;
      const n = new Set(v);
      n.add(activeTab);
      return n;
    });
  }, [activeTab]);

  const isTabScreen = ['/', '/home', '/explore', '/tickets', '/favorites', '/profile'].includes(location.pathname);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }].slice(-4));
  }, []);
  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleEventClick = (event: Event) => {
    navigateVT(navigate, `/events/${event.id}`, { state: { event } });
  };
  const handleArtistClick = (artist: Artist) => {
    navigateVT(navigate, `/artists/${artist.id}`, { state: { artist } });
  };
  const handleOrganizationClick = (org: Organization) => {
    navigateVT(navigate, `/organizers/${org.id}`, { state: { organization: org } });
  };
  const handleTabChange = (tab: Tab) => {
    if (tab === 'home') navigateVT(navigate, '/');
    else navigateVT(navigate, `/${tab}`);
  };
  const handleSmartBack = useCallback((fallbackPath: string = '/') => {
    if (typeof window !== 'undefined' && window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate]);

  const handleBookEvent = useCallback((event: Event, initialOptionId?: string | null) => {
    if (event.access_type === 'external' || Boolean(event.external_ticket_url?.trim())) {
      const externalUrl = event.external_ticket_url?.trim();
      if (!externalUrl) {
        addToast({ message: "Le lien de billetterie de cet événement n'est pas disponible.", type: 'error' });
        return;
      }
      try {
        const normalizedUrl = /^[a-z][a-z0-9+.-]*:/i.test(externalUrl) ? externalUrl : `https://${externalUrl}`;
        window.location.assign(new URL(normalizedUrl).toString());
      } catch {
        addToast({ message: "Le lien de billetterie fourni par l'organisateur est invalide.", type: 'error' });
      }
      return;
    }
    if (!session) {
      addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
      navigate('/login', { state: { returnTo: location.pathname, pendingBooking: { event, initialOptionId: initialOptionId || null } } });
      return;
    }
    setBookingInitialOptionId(initialOptionId || null);
    setBookingEvent(event);
  }, [session, addToast, navigate, location.pathname]);

  if (loading) return <AppLoadingScreen />;

  return (
    <div ref={scrollRef} className="min-h-dvh">
      <Suspense fallback={<TabLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomeScreen onEventClick={handleEventClick} onSearchClick={() => navigate('/explore')} onOpenNotifications={() => navigate('/notifications')} onProfileClick={() => navigate('/profile')} onArtistClick={handleArtistClick} onOrganizationClick={handleOrganizationClick} onToast={addToast} onBookEvent={handleBookEvent} onOpenAIAssistant={() => setAiAssistantOpen(true)} onOpenSettings={() => setSettingsModalOpen(true)} />} />
          <Route path="/explore" element={<ExploreScreen onEventClick={handleEventClick} onToast={addToast} />} />
          <Route path="/tickets" element={<TicketsScreen onEventClick={handleEventClick} onLogin={() => navigate('/login')} onToast={addToast} />} />
          <Route path="/favorites" element={<FavoritesScreen onEventClick={handleEventClick} onLogin={() => navigate('/login')} onToast={addToast} onUserClick={(u) => navigate(`/users/${u.id}`)} onArtistClick={handleArtistClick} onOrganizationClick={handleOrganizationClick} />} />
          <Route path="/profile" element={<ProfileScreen onLogin={() => navigate('/login')} onOrganizerDashboard={() => navigate('/organizer/dashboard')} onOpenNotifications={() => navigate('/notifications')} onOpenNotificationSettings={() => navigate('/notifications/settings')} onOpenSubscriptions={(tab) => navigate(tab ? `/subscriptions?tab=${tab}` : '/subscriptions')} onOpenTickets={() => navigate('/tickets')} onOpenAISettings={() => navigate('/ai-settings')} onToast={addToast} />} />
          <Route path="/events/:id" element={<EventDetailRoute onBack={handleSmartBack} onBook={handleBookEvent} onToast={addToast} onArtistClick={handleArtistClick} onOrganizationClick={handleOrganizationClick} />} />
          <Route path="/events/:id/edit" element={<EditEventRoute onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/artists/:id" element={<ArtistDetailRoute onBack={handleSmartBack} onEventClick={handleEventClick} onToast={addToast} />} />
          <Route path="/organizers/:id" element={<OrganizerDetailRoute onBack={handleSmartBack} onEventClick={handleEventClick} onToast={addToast} />} />
          <Route path="/users/:id" element={<UserProfileRoute onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/login" element={<AuthScreen mode="login" onSuccess={() => navigate('/')} onToggleMode={() => navigate('/signup')} onForgotPassword={() => navigate('/forgot-password')} />} />
          <Route path="/signup" element={<AuthScreen mode="signup" onSuccess={() => navigate('/')} onToggleMode={() => navigate('/login')} onForgotPassword={() => navigate('/forgot-password')} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen onBack={() => navigate(-1)} />} />
          <Route path="/otp" element={<OtpRoute />} />
          <Route path="/onboarding" element={<OnboardingScreen onComplete={() => navigate('/')} />} />
          <Route path="/notifications" element={<NotificationsScreen onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/notifications/settings" element={<NotificationSettingsScreen onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/subscriptions" element={<SubscriptionsScreen onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/ai-settings" element={<AISettingsScreen onBack={handleSmartBack} onToast={addToast} />} />
          <Route path="/organizer/dashboard" element={<OrganizerDashboardScreen onBack={handleSmartBack} onCreateEvent={() => navigate('/create')} onEditEvent={(e) => navigate(`/events/${e.id}/edit`)} onToast={addToast} />} />
          <Route path="/create" element={<CreateEventScreen onBack={handleSmartBack} onSuccess={(event) => { addToast({ message: 'Événement créé', type: 'success' }); navigate(`/events/${event.id}`); }} onToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {isTabScreen && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} ticketCount={liveTicketCount} canCreate={!!(user && (user.role === 'organizer' || user.role === 'artist'))} onCreateClick={() => navigate('/create')} />
      )}
      <ToastContainer toasts={toasts} onClose={closeToast} />
      <EdgeSwipeBack onBack={handleSmartBack} />
      <AIAssistantModal open={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} />
      <SettingsModal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
      {bookingEvent && (
        <BookingModal event={bookingEvent} initialOptionId={bookingInitialOptionId} onClose={() => { setBookingEvent(null); setBookingInitialOptionId(null); }} onToast={addToast} />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <FavoritesProvider>
            <DataSaverProvider>
              <AppContent />
            </DataSaverProvider>
          </FavoritesProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
