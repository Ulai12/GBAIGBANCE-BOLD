import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider } from '@/contexts/AppContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import type { Event, Artist, Organization } from '@/types';

const OnboardingScreen = lazy(() => import('@/screens/OnboardingScreen').then((module) => ({ default: module.OnboardingScreen })));
const AuthScreen = lazy(() => import('@/screens/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const ForgotPasswordScreen = lazy(() => import('@/screens/ForgotPasswordScreen').then((module) => ({ default: module.ForgotPasswordScreen })));
const OtpScreen = lazy(() => import('@/screens/OtpScreen').then((module) => ({ default: module.OtpScreen })));
const HomeScreen = lazy(() => import('@/screens/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const ExploreScreen = lazy(() => import('@/screens/ExploreScreen').then((module) => ({ default: module.ExploreScreen })));
const EventDetailScreen = lazy(() => import('@/screens/EventDetailScreen').then((module) => ({ default: module.EventDetailScreen })));
const TicketsScreen = lazy(() => import('@/screens/TicketsScreen').then((module) => ({ default: module.TicketsScreen })));
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));
const OrganizerDashboardScreen = lazy(() => import('@/screens/OrganizerDashboardScreen').then((module) => ({ default: module.OrganizerDashboardScreen })));
const CreateEventScreen = lazy(() => import('@/screens/CreateEventWizardScreen').then((module) => ({ default: module.CreateEventWizardScreen })));
const FavoritesScreen = lazy(() => import('@/screens/FavoritesScreen').then((module) => ({ default: module.FavoritesScreen })));
const ArtistDetailScreen = lazy(() => import('@/screens/ArtistDetailScreen').then((module) => ({ default: module.ArtistDetailScreen })));
const OrganizerDetailScreen = lazy(() => import('@/screens/OrganizerDetailScreen').then((module) => ({ default: module.OrganizerDetailScreen })));
const NotificationsScreen = lazy(() => import('@/screens/NotificationsScreen').then((module) => ({ default: module.NotificationsScreen })));
const NotificationSettingsScreen = lazy(() => import('@/screens/NotificationSettingsScreen').then((module) => ({ default: module.NotificationSettingsScreen })));
const SubscriptionsScreen = lazy(() => import('@/screens/SubscriptionsScreen').then((module) => ({ default: module.SubscriptionsScreen })));
const UserProfileScreen = lazy(() => import('@/screens/UserProfileScreen').then((module) => ({ default: module.UserProfileScreen })));
const AISettingsScreen = lazy(() => import('@/screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { SettingsModal } from '@/components/SettingsModal';
import { HomeScreenSkeleton } from '@/components/Skeleton';

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [screen, activeTab]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ update: () => void }>;
      addToast({
        message: 'Mise à jour disponible pour Gbaigbance',
        type: 'info',
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

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setScreen('eventDetail');
  };

  const handleBookEvent = useCallback((event: Event) => {
    if (!session) {
      addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
      setScreen('login');
      return;
    }
    setBookingEvent(event);
  }, [session, addToast]);

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
        <ForgotPasswordScreen onBack={() => setScreen('login')} onToast={addToast} />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'otp') {
    return (
      <>
        <OtpScreen email="user@example.com" onBack={() => setScreen('login')} onVerify={() => setScreen('home')} />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'eventDetail' && selectedEvent) {
    return (
      <>
        <EventDetailScreen
          event={selectedEvent}
          onBack={() => setScreen(activeTab)}
          onArtistClick={(artist) => { setSelectedArtist(artist); setScreen('artistDetail'); }}
          onBook={handleBookEvent}
          onOpenAISettings={() => setScreen('aiSettings')}
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
          onBack={() => setScreen(activeTab)}
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
          onBack={() => setScreen(activeTab)}
          onEventClick={(event) => { setSelectedEvent(event); setScreen('eventDetail'); }}
          onToast={addToast}
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
          onBack={() => setScreen(activeTab)}
          onEventClick={(event) => { setSelectedEvent(event); setScreen('eventDetail'); }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'notifications') {
    return (
      <>
        <NotificationsScreen
          onBack={() => setScreen(activeTab)}
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
          onBack={() => setScreen(activeTab)}
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
          onBack={() => setScreen(activeTab)}
          onArtistClick={(artist) => { setSelectedArtist(artist); setScreen('artistDetail'); }}
          onOrganizationClick={(org) => { setSelectedOrganization(org); setScreen('organizerDetail'); }}
          onUserClick={(profile) => { setSelectedUserId(profile.id); setScreen('userProfile'); }}
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
          onBack={() => setScreen(activeTab)}
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
          onBack={() => setScreen('profile')}
          onEventClick={(event) => { setSelectedEvent(event); setScreen('eventDetail'); }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  if (screen === 'createEvent') {
    return (
      <>
        <CreateEventScreen
          onBack={() => setScreen('home')}
          onCreated={(event) => { setSelectedEvent(event); setScreen('eventDetail'); }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setScreen(tab);
  };

  const canCreate = !!(user && (user.role === 'organizer' || user.role === 'artist'));

  return (
    <>
      <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent pb-28">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeScreen
            onEventClick={handleEventClick}
            onBookEvent={handleBookEvent}
            onSearchClick={() => { setActiveTab('explore'); setScreen('explore'); }}
            onOpenNotifications={() => setScreen('notifications')}
            onProfileClick={() => { setActiveTab('profile'); setScreen('profile'); }}
            onArtistClick={(artist) => { setSelectedArtist(artist); setScreen('artistDetail'); }}
            onOrganizationClick={(org) => { setSelectedOrganization(org); setScreen('organizerDetail'); }}
            onOpenAIAssistant={() => setAiAssistantOpen(true)}
            onOpenAISettings={() => setScreen('aiSettings')}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onToast={addToast}
          />
        </div>
        <div className={activeTab === 'explore' ? 'block' : 'hidden'}>
          <ExploreScreen onEventClick={handleEventClick} />
        </div>
        <div className={activeTab === 'tickets' ? 'block' : 'hidden'}>
          <TicketsScreen onEventClick={handleEventClick} onLogin={() => setScreen('login')} onToast={addToast} />
        </div>
        <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
          <FavoritesScreen
            onEventClick={handleEventClick}
            onLogin={() => setScreen('login')}
            onArtistClick={(artist) => { setSelectedArtist(artist); setScreen('artistDetail'); }}
            onOrganizationClick={(org) => { setSelectedOrganization(org); setScreen('organizerDetail'); }}
          />
        </div>
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileScreen
            onEventClick={handleEventClick}
            onLogin={() => setScreen('login')}
            onOrganizerDashboard={() => setScreen('organizerDashboard')}
            onOpenNotifications={() => setScreen('notifications')}
            onOpenNotificationSettings={() => setScreen('notificationSettings')}
            onOpenSubscriptions={() => setScreen('subscriptions')}
            onOpenTickets={() => handleTabChange('tickets')}
            onOpenAISettings={() => setScreen('aiSettings')}
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
            setScreen('login');
          } else {
            setScreen('createEvent');
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
          setScreen('aiSettings');
        }}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenAISettings={() => {
          setSettingsModalOpen(false);
          setScreen('aiSettings');
        }}
        onOpenNotifications={() => {
          setSettingsModalOpen(false);
          setScreen('notifications');
        }}
        onOpenNotificationSettings={() => {
          setSettingsModalOpen(false);
          setScreen('notificationSettings');
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
    <AppProvider>
      <FavoritesProvider>
        <Suspense fallback={<HomeScreenSkeleton />}>
          <AppContent />
        </Suspense>
      </FavoritesProvider>
    </AppProvider>
  );
}

export default App;
