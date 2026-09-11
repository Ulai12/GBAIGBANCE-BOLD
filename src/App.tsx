import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { TicketsScreen } from '@/screens/TicketsScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { HomeScreenSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchEventById } from '@/services/events';
import type { Event, Artist, Organization } from '@/types';

const OnboardingScreen = lazy(() => import('@/screens/OnboardingScreen').then((module) => ({ default: module.OnboardingScreen })));
const AuthScreen = lazy(() => import('@/screens/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const ForgotPasswordScreen = lazy(() => import('@/screens/ForgotPasswordScreen').then((module) => ({ default: module.ForgotPasswordScreen })));
const OtpScreen = lazy(() => import('@/screens/OtpScreen').then((module) => ({ default: module.OtpScreen })));
const EventDetailScreen = lazy(() => import('@/screens/EventDetailScreen').then((module) => ({ default: module.EventDetailScreen })));
const EditEventScreen = lazy(() => import('@/screens/EditEventScreen').then((module) => ({ default: module.EditEventScreen })));
const OrganizerDashboardScreen = lazy(() => import('@/screens/OrganizerDashboardScreen').then((module) => ({ default: module.OrganizerDashboardScreen })));
const CreateEventScreen = lazy(() => import('@/screens/CreateEventWizardScreen').then((module) => ({ default: module.CreateEventWizardScreen })));
const ArtistDetailScreen = lazy(() => import('@/screens/ArtistDetailScreen').then((module) => ({ default: module.ArtistDetailScreen })));
const OrganizerDetailScreen = lazy(() => import('@/screens/OrganizerDetailScreen').then((module) => ({ default: module.OrganizerDetailScreen })));
const NotificationsScreen = lazy(() => import('@/screens/NotificationsScreen').then((module) => ({ default: module.NotificationsScreen })));
const NotificationSettingsScreen = lazy(() => import('@/screens/NotificationSettingsScreen').then((module) => ({ default: module.NotificationSettingsScreen })));
const SubscriptionsScreen = lazy(() => import('@/screens/SubscriptionsScreen').then((module) => ({ default: module.SubscriptionsScreen })));
const UserProfileScreen = lazy(() => import('@/screens/UserProfileScreen').then((module) => ({ default: module.UserProfileScreen })));
const AISettingsScreen = lazy(() => import('@/screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));

type Screen =
  | 'onboarding'
  | 'login'
  | 'signup'
  | 'forgot'
  | 'otp'
  | 'home'
  | 'explore'
  | 'tickets'
  | 'favorites'
  | 'profile'
  | 'eventDetail'
  | 'editEvent'
  | 'organizerDashboard'
  | 'createEvent'
  | 'artistDetail'
  | 'organizerDetail'
  | 'notifications'
  | 'notificationSettings'
  | 'subscriptions'
  | 'userProfile'
  | 'aiSettings';

type Tab = 'home' | 'explore' | 'tickets' | 'favorites' | 'profile';

interface HistoryItem {
  screen: Screen;
  activeTab: Tab;
  selectedEvent: Event | null;
  selectedArtist: Artist | null;
  selectedOrganization: Organization | null;
  selectedUserId: string | null;
}

function AppContent() {
  const { loading, session, user } = useApp();
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('gbaigbance_onboarding_completed') === 'true') {
        return 'home';
      }
    } catch {
      // Ignorer si localStorage n'est pas accessible
      return 'onboarding';
    }
    return 'onboarding';
  });
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [, setHistoryStack] = useState<HistoryItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canCreate = !!(user && (user.role === 'organizer' || user.role === 'artist'));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [screen, activeTab]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const navigateTo = useCallback((nextScreen: Screen, payload?: {
    event?: Event | null;
    artist?: Artist | null;
    organization?: Organization | null;
    userId?: string | null;
    tab?: Tab;
  }) => {
    setHistoryStack((prev) => [
      ...prev,
      {
        screen,
        activeTab,
        selectedEvent,
        selectedArtist,
        selectedOrganization,
        selectedUserId,
      },
    ]);

    if (payload?.event !== undefined) setSelectedEvent(payload.event);
    if (payload?.artist !== undefined) setSelectedArtist(payload.artist);
    if (payload?.organization !== undefined) setSelectedOrganization(payload.organization);
    if (payload?.userId !== undefined) setSelectedUserId(payload.userId);
    if (payload?.tab) setActiveTab(payload.tab);

    setScreen(nextScreen);

    try {
      if (typeof window !== 'undefined') {
        window.history.pushState({ screen: nextScreen }, '');
      }
    } catch {
      // Ignore in restricted environments
    }
  }, [screen, activeTab, selectedEvent, selectedArtist, selectedOrganization, selectedUserId]);

  const handleGoBack = useCallback(() => {
    setHistoryStack((prev) => {
      if (prev.length === 0) {
        setScreen(activeTab);
        return [];
      }

      const nextStack = [...prev];
      const previous = nextStack.pop()!;

      setScreen(previous.screen);
      setActiveTab(previous.activeTab);
      setSelectedEvent(previous.selectedEvent);
      setSelectedArtist(previous.selectedArtist);
      setSelectedOrganization(previous.selectedOrganization);
      setSelectedUserId(previous.selectedUserId);

      return nextStack;
    });

    if (typeof window !== 'undefined' && window.location.search.includes('event=')) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        void 0;
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const onPopState = () => {
      handleGoBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleGoBack]);

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

  useEffect(() => {
    const handleToastEvent = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<Omit<ToastData, 'id'>>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };
    window.addEventListener('gba-toast', handleToastEvent);
    return () => window.removeEventListener('gba-toast', handleToastEvent);
  }, [addToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    if (eventId) {
      fetchEventById(eventId)
        .then((ev) => {
          if (ev) {
            setSelectedEvent(ev);
            setScreen('eventDetail');
          }
        })
        .catch(() => {});
    }
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleEventClick = (event: Event) => {
    navigateTo('eventDetail', { event });
  };

  const handleBookEvent = useCallback((event: Event) => {
    if (!session) {
      addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
      navigateTo('login');
      return;
    }
    setBookingEvent(event);
  }, [session, addToast, navigateTo]);

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  if (screen === 'onboarding') {
    return (
      <>
        <OnboardingScreen
          onComplete={() => {
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('gbaigbance_onboarding_completed', 'true');
              }
            } catch {
              // Ignore local storage error
            }
            setScreen('home');
          }}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'login' || screen === 'signup') {
    return (
      <>
        <AuthScreen
          mode={screen === 'login' ? 'login' : 'signup'}
          onSuccess={() => setScreen('home')}
          onToggleMode={() => setScreen(screen === 'login' ? 'signup' : 'login')}
          onForgotPassword={() => setScreen('forgot')}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'forgot') {
    return (
      <>
        <ForgotPasswordScreen onBack={handleGoBack} onToast={addToast} />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'otp') {
    return (
      <>
        <OtpScreen email="user@example.com" onBack={handleGoBack} onVerify={() => setScreen('home')} />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'eventDetail' && selectedEvent) {
    return (
      <>
        <EventDetailScreen
          event={selectedEvent}
          onBack={handleGoBack}
          onArtistClick={(artist) => navigateTo('artistDetail', { artist })}
          onEditEvent={(event) => navigateTo('editEvent', { event })}
          onBook={handleBookEvent}
          onOpenAISettings={() => navigateTo('aiSettings')}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'editEvent' && selectedEvent) {
    return (
      <>
        <EditEventScreen
          eventId={selectedEvent.id}
          onBack={handleGoBack}
          onSaved={(updatedEvent) => {
            setSelectedEvent(updatedEvent);
            addToast({ message: 'Événement mis à jour avec succès', type: 'success' });
            handleGoBack();
          }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'aiSettings') {
    return (
      <>
        <AISettingsScreen
          onBack={handleGoBack}
          onToast={(t) => addToast({ message: t.message, type: t.type || 'info' })}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'artistDetail' && selectedArtist) {
    return (
      <>
        <ArtistDetailScreen
          artist={selectedArtist}
          onBack={handleGoBack}
          onEventClick={(event) => navigateTo('eventDetail', { event })}
          onToast={addToast}
          onLogin={() => navigateTo('login')}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'organizerDetail' && selectedOrganization) {
    return (
      <>
        <OrganizerDetailScreen
          organization={selectedOrganization}
          onBack={handleGoBack}
          onEventClick={(event) => navigateTo('eventDetail', { event })}
          onToast={addToast}
          onLogin={() => navigateTo('login')}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'notifications') {
    return (
      <>
        <NotificationsScreen
          onBack={handleGoBack}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'notificationSettings') {
    return (
      <>
        <NotificationSettingsScreen
          onBack={handleGoBack}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'subscriptions') {
    return (
      <>
        <SubscriptionsScreen
          onBack={handleGoBack}
          onArtistClick={(artist) => navigateTo('artistDetail', { artist })}
          onOrganizationClick={(org) => navigateTo('organizerDetail', { organization: org })}
          onUserClick={(profile) => navigateTo('userProfile', { userId: profile.id })}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'userProfile' && selectedUserId) {
    return (
      <>
        <UserProfileScreen
          userId={selectedUserId}
          onBack={handleGoBack}
          onEventClick={handleEventClick}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'organizerDashboard') {
    return (
      <>
        <OrganizerDashboardScreen
          onBack={handleGoBack}
          onEventClick={(event) => navigateTo('eventDetail', { event })}
          onEditEvent={(event) => navigateTo('editEvent', { event })}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'createEvent') {
    if (!canCreate) {
      return (
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
            onClick={handleGoBack}
            className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
          >
            Retour
          </button>
        </div>
      );
    }
    return (
      <>
        <CreateEventScreen
          onBack={handleGoBack}
          onCreated={(event) => { setSelectedEvent(event); navigateTo('eventDetail', { event }); }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setScreen(tab);
    setHistoryStack([]);
  };

  return (
    <>
      <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent pb-28">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeScreen
            onEventClick={handleEventClick}
            onBookEvent={handleBookEvent}
            onSearchClick={() => { setActiveTab('explore'); setScreen('explore'); }}
            onOpenNotifications={() => navigateTo('notifications')}
            onProfileClick={() => { setActiveTab('profile'); setScreen('profile'); }}
            onArtistClick={(artist) => navigateTo('artistDetail', { artist })}
            onOrganizationClick={(org) => navigateTo('organizerDetail', { organization: org })}
            onOpenAIAssistant={() => setAiAssistantOpen(true)}
            onOpenAISettings={() => navigateTo('aiSettings')}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onToast={addToast}
          />
        </div>
        <div className={activeTab === 'explore' ? 'block' : 'hidden'}>
          <ExploreScreen onEventClick={handleEventClick} />
        </div>
        <div className={activeTab === 'tickets' ? 'block' : 'hidden'}>
          <TicketsScreen onEventClick={handleEventClick} onLogin={() => navigateTo('login')} onToast={addToast} />
        </div>
        <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
          <FavoritesScreen
            onEventClick={handleEventClick}
            onLogin={() => navigateTo('login')}
            onArtistClick={(artist) => navigateTo('artistDetail', { artist })}
            onOrganizationClick={(org) => navigateTo('organizerDetail', { organization: org })}
          />
        </div>
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileScreen
            onEventClick={handleEventClick}
            onLogin={() => navigateTo('login')}
            onOrganizerDashboard={() => navigateTo('organizerDashboard')}
            onOpenNotifications={() => navigateTo('notifications')}
            onOpenNotificationSettings={() => navigateTo('notificationSettings')}
            onOpenSubscriptions={() => navigateTo('subscriptions')}
            onOpenTickets={() => handleTabChange('tickets')}
            onOpenAISettings={() => navigateTo('aiSettings')}
            onToast={addToast}
          />
        </div>
      </div>
      <BottomNav
        active={activeTab}
        onNavigate={handleTabChange}
        onCreate={() => {
          if (!session) {
            addToast({ message: 'Connectez-vous pour créer un événement', type: 'info' });
            navigateTo('login');
          } else {
            navigateTo('createEvent');
          }
        }}
        canCreate={canCreate}
      />
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
          navigateTo('aiSettings');
        }}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenAISettings={() => {
          setSettingsModalOpen(false);
          navigateTo('aiSettings');
        }}
        onOpenNotifications={() => {
          setSettingsModalOpen(false);
          navigateTo('notifications');
        }}
        onOpenNotificationSettings={() => {
          setSettingsModalOpen(false);
          navigateTo('notificationSettings');
        }}
        onEditProfile={() => {
          setSettingsModalOpen(false);
          setActiveTab('profile');
          setScreen('profile');
        }}
      />
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <FavoritesProvider>
          <Suspense fallback={null}>
            <AppContent />
          </Suspense>
        </FavoritesProvider>
      </AppProvider>
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  );
}

export default App;
