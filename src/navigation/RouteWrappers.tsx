import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EditEventScreen } from '@/screens/EditEventScreen';
import { UserProfileScreen } from '@/screens/UserProfileScreen';
import { fetchEventById, fetchArtistById, fetchOrganizationById } from '@/services/events';
import { HomeScreenSkeleton } from '@/components/Skeleton';
import type { Event, Artist, Organization } from '@/types';
import type { ToastData } from '@/components/Toast';

const EventDetailScreen = lazy(() =>
  import('@/screens/EventDetailScreen').then((module) => ({ default: module.EventDetailScreen })),
);
const ArtistDetailScreen = lazy(() =>
  import('@/screens/ArtistDetailScreen').then((module) => ({ default: module.ArtistDetailScreen })),
);
const OrganizerDetailScreen = lazy(() =>
  import('@/screens/OrganizerDetailScreen').then((module) => ({ default: module.OrganizerDetailScreen })),
);

interface RouteProps {
  onToast: (toast: Omit<ToastData, 'id'>) => void;
  onBook: (event: Event) => void;
}

export function EventDetailRoute({ onToast, onBook }: RouteProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateEvent = (location.state as { event?: Event })?.event;

  const [event, setEvent] = useState<Event | null>(stateEvent || null);
  const [loading, setLoading] = useState(!stateEvent);

  useEffect(() => {
    if (!id) return;
    if (stateEvent && stateEvent.id === id) {
      setEvent(stateEvent);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchEventById(id)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setEvent(data);
          } else {
            onToast({ message: "Événement introuvable", type: 'error' });
          }
        }
      })
      .catch(() => {
        if (isMounted) onToast({ message: "Erreur de chargement de l'événement", type: 'error' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, stateEvent, onToast]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-[#17131D] dark:text-white mb-2">Événement introuvable</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Cet événement n'existe pas ou a été retiré.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<HomeScreenSkeleton />}>
      <EventDetailScreen
        event={event}
        onBack={handleBack}
        onArtistClick={(artist) => navigate(`/artists/${artist.id}`, { state: { artist } })}
        onEditEvent={(e) => navigate(`/events/${e.id}/edit`, { state: { event: e } })}
        onBook={onBook}
        onOpenAISettings={() => navigate('/ai-settings')}
        onToast={onToast}
      />
    </Suspense>
  );
}

export function EditEventRoute({ onToast }: { onToast: (toast: Omit<ToastData, 'id'>) => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/');
    return null;
  }

  return (
    <EditEventScreen
      eventId={id}
      onBack={() => navigate(-1)}
      onSaved={() => {
        onToast({ message: 'Événement mis à jour avec succès', type: 'success' });
        navigate(`/events/${id}`);
      }}
      onToast={onToast}
    />
  );
}

export function ArtistDetailRoute({ onToast }: { onToast: (toast: Omit<ToastData, 'id'>) => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateArtist = (location.state as { artist?: Artist })?.artist;

  const [artist, setArtist] = useState<Artist | null>(stateArtist || null);
  const [loading, setLoading] = useState(!stateArtist);

  useEffect(() => {
    if (!id) return;
    if (stateArtist && stateArtist.id === id) {
      setArtist(stateArtist);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchArtistById(id)
      .then((data) => {
        if (isMounted) {
          if (data) setArtist(data);
          else onToast({ message: 'Artiste introuvable', type: 'error' });
        }
      })
      .catch(() => {
        if (isMounted) onToast({ message: "Erreur lors du chargement de l'artiste", type: 'error' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, stateArtist, onToast]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-[#17131D] dark:text-white mb-2">Artiste introuvable</h2>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<HomeScreenSkeleton />}>
      <ArtistDetailScreen
        artist={artist}
        onBack={handleBack}
        onEventClick={(event) => navigate(`/events/${event.id}`, { state: { event } })}
        onToast={onToast}
        onLogin={() => navigate('/login')}
      />
    </Suspense>
  );
}

export function OrganizerDetailRoute({ onToast }: { onToast: (toast: Omit<ToastData, 'id'>) => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateOrg = (location.state as { organization?: Organization })?.organization;

  const [organization, setOrganization] = useState<Organization | null>(stateOrg || null);
  const [loading, setLoading] = useState(!stateOrg);

  useEffect(() => {
    if (!id) return;
    if (stateOrg && stateOrg.id === id) {
      setOrganization(stateOrg);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchOrganizationById(id)
      .then((data) => {
        if (isMounted) {
          if (data) setOrganization(data);
          else onToast({ message: 'Organisateur introuvable', type: 'error' });
        }
      })
      .catch(() => {
        if (isMounted) onToast({ message: "Erreur lors du chargement de l'organisateur", type: 'error' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, stateOrg, onToast]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-[#17131D] dark:text-white mb-2">Organisateur introuvable</h2>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<HomeScreenSkeleton />}>
      <OrganizerDetailScreen
        organization={organization}
        onBack={handleBack}
        onEventClick={(event) => navigate(`/events/${event.id}`, { state: { event } })}
        onToast={onToast}
        onLogin={() => navigate('/login')}
      />
    </Suspense>
  );
}

export function UserProfileRoute({ onToast }: { onToast: (toast: Omit<ToastData, 'id'>) => void }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/');
    return null;
  }

  return (
    <UserProfileScreen
      userId={id}
      onBack={() => navigate(-1)}
      onEventClick={(event) => navigate(`/events/${event.id}`, { state: { event } })}
      onToast={onToast}
    />
  );
}
