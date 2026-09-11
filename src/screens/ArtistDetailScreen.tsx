import { useState, useEffect } from 'react';
import { ChevronLeft, Music2, Calendar, Share2, Heart, Eye, Sparkles } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { fetchArtistById, fetchEventsByArtist } from '@/services/events';
import { formatNumber } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import type { Artist, Event } from '@/types';
import type { ToastData } from '@/components/Toast';

interface ArtistDetailScreenProps {
  artist: Artist;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
  onLogin?: () => void;
}

export function ArtistDetailScreen({ artist, onBack, onEventClick, onToast, onLogin }: ArtistDetailScreenProps) {
  const { language, session, t } = useApp();
  const { isFollowingArtist, toggleFollowArtist } = useFavorites();
  const [fullArtist, setFullArtist] = useState<Artist>(artist);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const following = isFollowingArtist(artist.id);

  useEffect(() => {
    fetchArtistById(artist.id).then((data) => {
      if (data) setFullArtist(data);
    });
    fetchEventsByArtist(artist.id)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [artist.id]);

  const handleFollow = async () => {
    if (!session) {
      onToast({
        message: t('events', 'artist.followPromptLogin') || 'Connectez-vous pour vous abonner et recevoir les alertes.',
        type: 'info',
      });
      onLogin?.();
      return;
    }

    try {
      const willFollow = !following;
      await toggleFollowArtist(artist.id);
      onToast({
        message: willFollow
          ? t('events', 'artist.followedToast') || `Vous suivez maintenant ${fullArtist.name}`
          : t('events', 'artist.unfollowedToast') || `Désabonné de ${fullArtist.name}`,
        type: 'success',
      });
    } catch {
      onToast({ message: t('common', 'error') || 'Une erreur est survenue', type: 'error' });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${fullArtist.name} sur Gbaigbance`,
      text: `Découvrez le profil et les événements de ${fullArtist.name} sur Gbaigbance`,
      url: window.location.href,
    };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        onToast({ message: t('events', 'artist.profileShared') || 'Profil partagé', type: 'success' });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        onToast({ message: t('events', 'artist.linkCopied') || 'Lien copié dans le presse-papiers', type: 'success' });
      }
    } catch {
      // Ignorer l'annulation du partage
    }
  };

  const flag = COUNTRY_FLAGS[fullArtist.country] || '';
  const totalViews = events.reduce((sum, e) => sum + (e.views_count || 0), 0);
  const displayFollowers = (fullArtist.followers_count || 0) + (following ? 1 : 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Cover Header */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={fullArtist.cover_url || fullArtist.photo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800'}
          alt={fullArtist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#EDE8FF] dark:from-[#0f0d19] via-black/25 to-black/50" />

        {/* Action buttons */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Partager le profil"
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info Container */}
      <div className="max-w-md mx-auto px-5 -mt-16 relative">
        <div className="flex items-end gap-4">
          <UserAvatar
            src={fullArtist.photo_url}
            name={fullArtist.name}
            role="artist"
            size="2xl"
            shape="circle"
            isVerified={fullArtist.is_verified}
            className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-white dark:ring-[#14121E] shadow-xl"
          />
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#17131D] dark:text-white tracking-tight">
                {fullArtist.name}
              </h1>
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-0.5">
              {flag} {fullArtist.city || 'Côte d’Ivoire'}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          <div className="rounded-[1.4rem] p-3 text-center bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs">
            <Heart className={`w-4 h-4 mx-auto mb-1 ${following ? 'text-red-500 fill-red-500' : 'text-[#6600FF]'}`} />
            <p className="text-lg font-black text-[#17131D] dark:text-white animate-pop">
              {formatNumber(displayFollowers, language)}
            </p>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              {t('events', 'artist.followers') || 'Abonnés'}
            </p>
          </div>
          <div className="rounded-[1.4rem] p-3 text-center bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs">
            <Calendar className="w-4 h-4 text-[#6600FF] mx-auto mb-1" />
            <p className="text-lg font-black text-[#17131D] dark:text-white animate-pop">
              {events.length}
            </p>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              {t('events', 'artist.events') || 'Événements'}
            </p>
          </div>
          <div className="rounded-[1.4rem] p-3 text-center bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs">
            <Eye className="w-4 h-4 text-[#6600FF] mx-auto mb-1" />
            <p className="text-lg font-black text-[#17131D] dark:text-white animate-pop">
              {formatNumber(totalViews, language)}
            </p>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
              {t('events', 'artist.views') || 'Vues'}
            </p>
          </div>
        </div>

        {/* Genres */}
        {fullArtist.genres && fullArtist.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {fullArtist.genres.map((genre) => (
              <span
                key={genre}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 text-[#6600FF] dark:text-purple-300"
              >
                <Music2 className="w-3.5 h-3.5" />
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Follow Button */}
        <button
          type="button"
          onClick={handleFollow}
          className={`w-full mt-5 py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.98] cursor-pointer shadow-md flex items-center justify-center gap-2 ${
            following
              ? 'bg-white dark:bg-white/15 text-[#6600FF] dark:text-white border border-[#6600FF]/30 dark:border-white/20'
              : 'bg-[#6600FF] text-white hover:bg-[#5200cc]'
          }`}
        >
          <Heart className={`w-4 h-4 ${following ? 'fill-[#6600FF] dark:fill-white' : ''}`} />
          {following
            ? (t('events', 'artist.unfollow') || 'Abonné · Ne plus suivre')
            : (t('events', 'artist.follow') || 'Suivre cet artiste')}
        </button>

        {/* Bio */}
        {fullArtist.bio && (
          <div className="mt-6 rounded-2xl bg-white/70 dark:bg-white/5 p-4 border border-black/5 dark:border-white/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#17131D] dark:text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6600FF]" /> {t('events', 'artist.biography') || 'Biographie'}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal break-words whitespace-pre-line">
              {fullArtist.bio}
            </p>
          </div>
        )}

        {/* Events List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#17131D] dark:text-white">
              <Calendar className="w-5 h-5 text-[#6600FF]" /> {t('events', 'artist.eventsAndConcerts') || 'Événements & Concerts'}
            </h2>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {events.length}{' '}
              {events.length > 1
                ? (t('events', 'artist.availablePlural') || 'disponibles')
                : (t('events', 'artist.available') || 'disponible')}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <Skeleton className="rounded-none h-32 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              title={t('events', 'noEvents') || 'Aucun événement'}
              description={t('events', 'artist.noEvents') || "Cet artiste n'a pas d'événement programmé pour le moment."}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
