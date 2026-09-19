import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { Ticket as TicketIcon } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { EdgeSwipeBack } from '@/components/EdgeSwipeBack';
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { TicketsScreen } from '@/screens/TicketsScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { HomeScreenSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  EventDetailRoute,
  EditEventRoute,
  ArtistDetailRoute,
  OrganizerDetailRoute,
  UserProfileRoute,
} from '@/navigation/RouteWrappers';
import type { Event, Artist, Organization } from '@/types';

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

function AppContent() {
  const { loading, session, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canCreate = !!(user && (user.role === 'organizer' || user.role === 'artist'));

  // Determine active tab based on current pathname
  const activeTab: Tab = (() => {
    const path = location.pathname;
    if (path === '/explore') return 'explore';
    if (path === '/tickets') return 'tickets';
    if (path === '/favorites') return 'favorites';
    if (path === '/profile') return 'profile';
    return 'home';
  })();

  const isTabScreen = ['/', '/home', '/explore', '/tickets', '/favorites', '/profile'].includes(location.pathname);

  // Scroll to top on navigation
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

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
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // PWA update notification
  useEffect(() => {
    const handleUpdate = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<{ update: () => void }>;
      addToast({
        message: 'Mise à jour disponible pour Gbaïgbancê',
        type: 'info',
        persistent: true,
        action: customEvent.detail?.update
          ? {
              label: 'Actualiser',
              onClick: () => customEvent.detail.update(),
            }
          : undefined,
      });
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, [addToast]);

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
    navigate(`/events/${event.id}`, { state: { event } });
  };

  const handleArtistClick = (artist: Artist) => {
    navigate(`/artists/${artist.id}`, { state: { artist } });
  };

  const handleOrganizationClick = (org: Organization) => {
    navigate(`/organizers/${org.id}`, { state: { organization: org } });
  };

  const handleBookEvent = useCallback((event: Event) => {
    if (!session) {
      addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
      navigate('/login');
      return;
    }
    setBookingEvent(event);
  }, [session, addToast, navigate]);

  const handleTabChange = (tab: Tab) => {
    if (tab === 'home') navigate('/');
    else navigate(`/${tab}`);
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  return (
    <>
      <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent">
        {isTabScreen ? (
          <div className="pb-28">
            <div className={activeTab === 'home' ? 'block' : 'hidden'}>
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
            </div>
            <div className={activeTab === 'explore' ? 'block' : 'hidden'}>
              <ExploreScreen onEventClick={handleEventClick} />
            </div>
            <div className={activeTab === 'tickets' ? 'block' : 'hidden'}>
              <TicketsScreen
                onEventClick={handleEventClick}
                onLogin={() => navigate('/login')}
                onToast={addToast}
              />
            </div>
            <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
              <FavoritesScreen
                onEventClick={handleEventClick}
                onLogin={() => navigate('/login')}
                onArtistClick={handleArtistClick}
                onOrganizationClick={handleOrganizationClick}
              />
            </div>
            <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
              <ProfileScreen
                onEventClick={handleEventClick}
                onLogin={() => navigate('/login')}
                onOrganizerDashboard={() => navigate('/organizer/dashboard')}
                onOpenNotifications={() => navigate('/notifications')}
                onOpenNotificationSettings={() => navigate('/notifications/settings')}
                onOpenSubscriptions={() => navigate('/subscriptions')}
                onOpenTickets={() => navigate('/tickets')}
                onOpenAISettings={() => navigate('/ai-settings')}
                onToast={addToast}
              />
            </div>
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
                  onSuccess={() => navigate('/')}
                  onToggleMode={() => navigate('/signup')}
                  onForgotPassword={() => navigate('/forgot-password')}
                  onToast={addToast}
                />
              }
            />
            <Route
              path="/signup"
              element={
                <AuthScreen
                  mode="signup"
                  onSuccess={() => navigate('/')}
                  onToggleMode={() => navigate('/login')}
                  onForgotPassword={() => navigate('/forgot-password')}
                  onToast={addToast}
                />
              }
            />
            <Route
              path="/forgot-password"
              element={<ForgotPasswordScreen onBack={() => navigate(-1)} onToast={addToast} />}
            />
            <Route
              path="/otp"
              element={
                <OtpScreen email="user@example.com" onBack={() => navigate(-1)} onVerify={() => navigate('/')} />
              }
            />
            <Route
              path="/events/:id"
              element={<EventDetailRoute onToast={addToast} onBook={handleBookEvent} />}
            />
            <Route path="/events/:id/edit" element={<EditEventRoute onToast={addToast} />} />
            <Route path="/artists/:id" element={<ArtistDetailRoute onToast={addToast} />} />
            <Route path="/organizers/:id" element={<OrganizerDetailRoute onToast={addToast} />} />
            <Route path="/users/:id" element={<UserProfileRoute onToast={addToast} />} />
            <Route
              path="/notifications"
              element={<NotificationsScreen onBack={() => navigate(-1)} onToast={addToast} />}
            />
            <Route
              path="/notifications/settings"
              element={<NotificationSettingsScreen onBack={() => navigate(-1)} onToast={addToast} />}
            />
            <Route
              path="/subscriptions"
              element={
                <SubscriptionsScreen
                  onBack={() => navigate(-1)}
                  onArtistClick={handleArtistClick}
                  onOrganizationClick={handleOrganizationClick}
                  onUserClick={(p) => navigate(`/users/${p.id}`)}
                />
              }
            />
            <Route
              path="/organizer/dashboard"
              element={
                <OrganizerDashboardScreen
                  onBack={() => navigate(-1)}
                  onEventClick={handleEventClick}
                  onEditEvent={(ev) => navigate(`/events/${ev.id}/edit`, { state: { event: ev } })}
                  onToast={addToast}
                />
              }
            />
            <Route
              path="/create"
              element={
                !canCreate ? (
                  <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#6600FF] mb-4">
                      <TicketIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-[#17131D] dark:text-white mb-2">
                      Espace Créateur Réservé
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6">
                      La publication d'événements est réservée aux comptes Organisateurs et Artistes vérifiés.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>
                ) : (
                  <CreateEventScreen
                    onBack={() => navigate(-1)}
                    onCreated={(event) => navigate(`/events/${event.id}`, { state: { event } })}
                    onToast={addToast}
                  />
                )
              }
            />
            <Route
              path="/ai-settings"
              element={
                <AISettingsScreen
                  onBack={() => navigate(-1)}
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
          onCreate={() => {
            if (!session) {
              addToast({ message: 'Connectez-vous pour créer un événement', type: 'info' });
              navigate('/login');
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
        onClose={() => setBookingEvent(null)}
        onSuccess={(qrCode) => {
          addToast({ message: `Billet réservé ! Code: ${qrCode}`, type: 'success' });
          setBookingEvent(null);
        }}
      />

      <AIAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        onOpenSettings={() => {
          setAiAssistantOpen(false);
          navigate('/ai-settings');
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

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <FavoritesProvider>
            <Suspense fallback={null}>
              <AppContent />
            </Suspense>
          </FavoritesProvider>
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
