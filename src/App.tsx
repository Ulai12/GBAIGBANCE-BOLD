import { useState, useCallback, useEffect, useRef } from 'react';
import { BookingModal } from '@/components/BookingModal';
import { AppProvider, useApp } from '@/hooks/useApp';
import { BottomNav } from '@/components/BottomNav';
import { ToastContainer, type ToastData } from '@/components/Toast';
import { DynamicBackground } from '@/components/DynamicBackground';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { OtpScreen } from '@/screens/OtpScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { EventDetailScreen } from '@/screens/EventDetailScreen';
import { TicketsScreen } from '@/screens/TicketsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { OrganizerDashboardScreen } from '@/screens/OrganizerDashboardScreen';
import { CreateEventScreen } from '@/screens/CreateEventScreen';
import { FavoritesScreen } from '@/screens/FavoritesScreen';
import { ArtistDetailScreen } from '@/screens/ArtistDetailScreen';
import { OrganizerDetailScreen } from '@/screens/OrganizerDetailScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { NotificationSettingsScreen } from '@/screens/NotificationSettingsScreen';
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen';
import { UserProfileScreen } from '@/screens/UserProfileScreen';
import type { Event, Artist, Organization, Profile } from '@/types';

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
  | 'userProfile';

type Tab = 'home' | 'explore' | 'tickets' | 'favorites' | 'profile';

function AppContent() {
  const { loading, session, user, dynamicBg, theme } = useApp();
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [screen, activeTab]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-16 h-16 rounded-full border-4 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" />
      </div>
    );
  }

  if (screen === 'onboarding') {
    return (
      <>
        <OnboardingScreen onComplete={() => setScreen(session ? 'home' : 'login')} />
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
          onBook={(_event) => {
            if (!session) {
              addToast({ message: 'Connectez-vous pour réserver', type: 'info' });
              setScreen('login');
            }
          }}
          onToast={addToast}
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

  const handleArtistClick = (artist: Artist) => {
    setSelectedArtist(artist);
    setScreen('artistDetail');
  };

  const handleOrganizerClick = (org: Organization) => {
    setSelectedOrganization(org);
    setScreen('organizerDetail');
  };

  const canCreate = !!(user && (user.role === 'organizer' || user.role === 'artist'));

  return (
    <>
      <div ref={scrollRef} className="min-h-screen relative z-10 bg-transparent">
        {activeTab === 'home' && (
          <HomeScreen
            onEventClick={handleEventClick}
            onBookEvent={handleBookEvent}
            onSearchClick={() => { setActiveTab('explore'); setScreen('explore'); }}
            onOpenNotifications={() => setScreen('notifications')}
            onProfileClick={() => { setActiveTab('profile'); setScreen('profile'); }}
            onToast={addToast}
          />
        )}
        {activeTab === 'explore' && (
          <ExploreScreen onEventClick={handleEventClick} />
        )}
        {activeTab === 'tickets' && (
          <TicketsScreen onEventClick={handleEventClick} onLogin={() => setScreen('login')} onToast={addToast} />
        )}
        {activeTab === 'favorites' && (
          <FavoritesScreen onEventClick={handleEventClick} onLogin={() => setScreen('login')} />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen
            onEventClick={handleEventClick}
            onLogin={() => setScreen('login')}
            onOrganizerDashboard={() => setScreen('organizerDashboard')}
            onOpenNotifications={() => setScreen('notifications')}
            onOpenNotificationSettings={() => setScreen('notificationSettings')}
            onOpenSubscriptions={() => setScreen('subscriptions')}
            onToast={addToast}
          />
        )}
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
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppBackground />
      <AppContent />
    </AppProvider>
  );
}

function AppBackground() {
  const { dynamicBg, theme } = useApp();
  return <DynamicBackground enabled={dynamicBg} theme={theme} />;
}

export default App;
