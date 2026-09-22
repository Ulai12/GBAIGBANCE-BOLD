import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Heart,
  Ticket,
  BadgeCheck,
  Film,
  AlertCircle,
  Flag,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useScrollGlass } from '@/hooks/useScrollGlass';
import { formatFullDate, formatTime } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import type { Event, EventWithRelations, Artist, EventCollaborator, TicketOption, Profile } from '@/types';
import {
  fetchEventById,
  fetchCollaborators,
  fetchTicketOptions,
  incrementEventViews,
  subscribeToEventLive,
  subscribeToTicketInventory,
  isEventTerminated,
} from '@/services/events';
import { getPublicEventCache, setPublicEventCache } from '@/infrastructure/cache/storage';
import { shareEventNative } from '@/utils/share';
import { haptic } from '@/hooks/useHaptics';
import { fetchEventAttendees, type AttendeeProfile } from '@/services/attendeesService';
import { toggleUserFollow } from '@/features/users/follows';

// Subcomponents
import { ProgressiveBlurHero } from '@/components/event-detail/ProgressiveBlurHero';
import { EventCountdown } from '@/components/event-detail/EventCountdown';
import { EventTicketsList } from '@/components/event-detail/EventTicketsList';
import { EventAIInsights } from '@/components/EventAIInsights';
import { EventMapPreview } from '@/components/EventMapPreview';
import { EventAttendeesSection } from '@/components/event-detail/EventAttendeesSection';
import { EventAttendeesModal } from '@/components/event-detail/EventAttendeesModal';
import { EventReportModal } from '@/components/event-detail/EventReportModal';
import { EventInteractionPanel } from '@/components/EventInteractionPanel';
import { EventSchedule } from '@/components/EventSchedule';
import { EventLiveLinks } from '@/components/EventLiveLinks';
import { EventSponsors } from '@/components/EventSponsors';
import { BookingModal } from '@/components/BookingModal';
import { EventManagementModal } from '@/components/EventManagementModal';
import { Lightbox } from '@/components/Lightbox';
import { ShareModal } from '@/components/ShareModal';
import { UserAvatar } from '@/components/UserAvatar';

interface EventDetailScreenProps {
  event: Event;
  onBack: () => void;
  onArtistClick: (artist: Artist) => void;
  onBook: (event: Event) => void;
  onEditEvent?: (event: Event) => void;
  onOpenAISettings?: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  onUserClick?: (user: Profile) => void;
}

// Détection robuste et normalisation du countdown sans NaN
function useCountdown(targetDate?: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isValid: boolean;
  }>(() => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, isValid: false };
    const targetMs = new Date(targetDate).getTime();
    if (isNaN(targetMs)) return { days: 0, hours: 0, minutes: 0, seconds: 0, isValid: false };
    const diff = targetMs - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isValid: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isValid: true,
    };
  });

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isValid: false });
      return;
    }
    const targetMs = new Date(targetDate).getTime();
    if (isNaN(targetMs)) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isValid: false });
      return;
    }

    const update = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isValid: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isValid: true,
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function getVideoEmbedUrl(rawUrl: string | null | undefined): { isEmbed: boolean; url: string } | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const url = rawUrl.trim();

  // YouTube match
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { isEmbed: true, url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}` };
  }

  // Vimeo match
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { isEmbed: true, url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  return { isEmbed: false, url };
}

export function EventDetailScreen({
  event,
  onBack,
  onArtistClick,
  onBook,
  onEditEvent,
  onOpenAISettings,
  onToast,
  onUserClick,
}: EventDetailScreenProps) {
  const { user, theme, language } = useApp();
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const { scrollY } = useScrollGlass(12);

  const [fullEvent, setFullEvent] = useState<EventWithRelations | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedTicketOptionId, setSelectedTicketOptionId] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [liveViews, setLiveViews] = useState(event.views_count);
  const [liveAttendees, setLiveAttendees] = useState(event.attendees_count);
  const [lightboxState, setLightboxState] = useState<{ open: boolean; initialIndex: number } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Nouveaux états : Signalement & Participants réels avec priorité aux amis
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeProfile[]>([]);
  const [attendeesFriendsCount, setAttendeesFriendsCount] = useState(0);
  const [attendeesLoading, setAttendeesLoading] = useState(true);

  // Chargement des vrais participants (tickets + profils réels Supabase) avec amis en tête
  useEffect(() => {
    let isMounted = true;
    setAttendeesLoading(true);
    fetchEventAttendees(event.id, user?.id)
      .then((res) => {
        if (!isMounted) return;
        setAttendees(res.attendees);
        setAttendeesFriendsCount(res.friendsCount);
        if (res.totalCount > 0) {
          setLiveAttendees(res.totalCount);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement participants:', err);
      })
      .finally(() => {
        if (isMounted) setAttendeesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [event.id, user?.id]);

  const handleToggleFollowAttendee = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) {
      onToast({ message: 'Connectez-vous pour suivre ce profil', type: 'info' });
      return false;
    }
    try {
      const isNowFollowing = await toggleUserFollow(user.id, targetUserId);
      setAttendees((prev) =>
        prev.map((a) => (a.id === targetUserId ? { ...a, isFriend: isNowFollowing } : a))
      );
      setAttendeesFriendsCount((prev) => (isNowFollowing ? prev + 1 : Math.max(0, prev - 1)));
      haptic.selection();
      onToast({
        message: isNowFollowing ? 'Abonnement réussi !' : 'Désabonnement effectué',
        type: 'success',
      });
      return isNowFollowing;
    } catch (err) {
      console.error('Erreur lors du suivi:', err);
      onToast({ message: 'Action impossible pour le moment', type: 'error' });
      return false;
    }
  };

  const handleSelectAttendeeProfile = (profile: Profile) => {
    setShowAttendeesModal(false);
    if (onUserClick) {
      onUserClick(profile);
    } else {
      window.location.href = `/users/${profile.id}`;
    }
  };

  // Synchronisation des variables CSS de parallaxe sans à-coups (rAF passif)
  useEffect(() => {
    let animationFrameId: number;
    const handleScroll = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const progress = Math.min(1, Math.max(0, y / 360));
        document.documentElement.style.setProperty('--scroll-y', `${y}px`);
        document.documentElement.style.setProperty('--scroll-progress', `${progress}`);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Chargement offline-first et Supabase de l'événement
  useEffect(() => {
    let isMounted = true;

    getPublicEventCache(event.id)
      .then((cached) => {
        if (cached?.data && isMounted) {
          setFullEvent(cached.data);
          if (cached.data.ticket_options) setTicketOptions(cached.data.ticket_options);
        }
      })
      .catch(() => {});

    fetchEventById(event.id)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setFullEvent(data);
          setLiveViews(data.views_count);
          setLiveAttendees(data.attendees_count);
          setPublicEventCache(event.id, data).catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Error fetching event details:', err);
      });

    fetchCollaborators(event.id)
      .then((c) => isMounted && setCollaborators(c))
      .catch((err) => console.error('collabs err', err));

    fetchTicketOptions(event.id)
      .then((opts) => isMounted && setTicketOptions(opts))
      .catch((err) => console.error('ticket opts err', err));

    incrementEventViews(event.id)
      .then(() => isMounted && setLiveViews((v) => v + 1))
      .catch(() => {});

    const unsubLive = subscribeToEventLive(event.id, {
      onStatusChange: (newStatus) => {
        if (!isMounted) return;
        setFullEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
      },
      onAttendeesChange: (newCount) => {
        if (!isMounted) return;
        setLiveAttendees(newCount);
      },
      onViewsChange: (newCount) => {
        if (!isMounted) return;
        setLiveViews(newCount);
      },
      onEventUpdate: (updatedEvent) => {
        if (!isMounted) return;
        setFullEvent((prev) => (prev ? { ...prev, ...updatedEvent } : (updatedEvent as EventWithRelations)));
      },
    });

    const unsubTickets = subscribeToTicketInventory(event.id, (updatedOption) => {
      if (!isMounted) return;
      setTicketOptions((prev) =>
        prev.map((opt) => (opt.id === updatedOption.id ? { ...opt, ...updatedOption } : opt))
      );
    });

    return () => {
      isMounted = false;
      unsubLive();
      unsubTickets();
    };
  }, [event.id]);

  const displayEvent = fullEvent && fullEvent.id === event.id ? fullEvent : event;
  const isDark = theme === 'dark';

  // Résolution robuste de la date cible pour le compte à rebours
  const targetDateForCountdown = displayEvent.starts_at || displayEvent.date;
  const countdown = useCountdown(targetDateForCountdown);

  // Extraction propre des artistes
  const rawEventArtists = (displayEvent as EventWithRelations)?.event_artists;
  const artists: Artist[] = Array.isArray(rawEventArtists)
    ? rawEventArtists
        .map((item: unknown) => {
          if (!item) return null;
          if (typeof item === 'object' && 'artist' in item && (item as { artist?: Artist }).artist) {
            return (item as { artist: Artist }).artist;
          }
          if (typeof item === 'object' && 'name' in item && 'id' in item) {
            return item as Artist;
          }
          return null;
        })
        .filter((a): a is Artist => Boolean(a && a.id && a.name))
    : [];

  const flag = COUNTRY_FLAGS[displayEvent.country || event.country] || '';
  const isOrganizer = !!(user && displayEvent.organizer_user_id === user.id);
  const eventHasEnded = isEventTerminated(displayEvent as Event);
  const canBook = displayEvent.status === 'published' && !eventHasEnded;
  const statusLabel =
    displayEvent.status === 'paused'
      ? 'Ventes en pause'
      : displayEvent.status === 'suspended'
      ? 'Événement suspendu'
      : displayEvent.status === 'cancelled'
      ? 'Événement annulé'
      : displayEvent.status === 'completed' || eventHasEnded
      ? 'Événement terminé'
      : null;

  const galleryImages = Array.from(
    new Set([displayEvent.cover_url, ...(displayEvent.images || [])].filter((img): img is string => Boolean(img)))
  );
  const coverImage =
    galleryImages[0] ||
    'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800';

  const openLightbox = (target: string | number) => {
    let index = 0;
    if (typeof target === 'number') {
      index = target;
    } else {
      const found = galleryImages.indexOf(target);
      index = found >= 0 ? found : 0;
    }
    setLightboxState({ open: true, initialIndex: index });
  };

  const videoInfo = getVideoEmbedUrl(displayEvent.video_url);

  const handleShare = async () => {
    haptic.selection();
    const shared = await shareEventNative(displayEvent, onToast);
    if (!shared) {
      setShowShareModal(true);
    }
  };

  const handleLike = () => {
    toggleLike(event.id);
    if (!liked) {
      haptic.success();
      onToast({ message: 'Ajouté à vos favoris', type: 'success' });
    } else {
      haptic.light();
      onToast({ message: 'Retiré de vos favoris', type: 'info' });
    }
  };

  const handleSelectPass = (optionId: string) => {
    haptic.selection();
    setSelectedTicketOptionId(optionId);
    setShowBooking(true);
    onBook?.(displayEvent as Event);
  };

  // Formatage ultra-robuste de la date et de l'heure (Haute lisibilité, zéro chevauchement)
  const eventDateObj = new Date(targetDateForCountdown || '');
  const isDateValid = !isNaN(eventDateObj.getTime());

  let dateMainText = displayEvent.date || 'Date à confirmer';
  let dateSubText = 'Date certifiée';
  if (isDateValid) {
    const weekday = eventDateObj.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' });
    const day = eventDateObj.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric' });
    const month = eventDateObj.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    dateMainText = `${capitalizedWeekday} ${day} ${month}`;
    dateSubText = `${eventDateObj.getFullYear()}`;
  }

  const startTimeStr = displayEvent.time || (isDateValid ? formatTime(targetDateForCountdown) : '');
  const endTimeStr = displayEvent.time_end || (displayEvent.ends_at ? formatTime(displayEvent.ends_at) : '');
  const timeMainText = startTimeStr
    ? (endTimeStr ? `${startTimeStr} - ${endTimeStr}` : `Dès ${startTimeStr}`)
    : 'Horaire à confirmer';
  const timeSubText = startTimeStr ? 'Heure locale (GMT)' : 'À préciser';
  const formattedDate = isDateValid
    ? formatFullDate(targetDateForCountdown, language)
    : (displayEvent.date || 'Date à confirmer');

  // L'en-tête compact n'apparaît qu'après le hero pour éviter TOUT chevauchement visuel avec le titre et le compte à rebours
  const showCompactHeader = scrollY > 260;

  return (
    <div className="min-h-screen relative bg-[#f4f1ff] dark:bg-[#0c0a14] text-[#1A1A2E] dark:text-white antialiased selection:bg-[#6600FF]/20">
      {/* 
        AMBIENT BACKGROUND (Statique, très flouté, optimisé mobile)
        Fournit la radiance colorimétrique de l'affiche sans saccade matérielle.
      */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none bg-[#f4f1ff] dark:bg-[#0c0a14]">
        <img
          src={coverImage}
          alt=""
          decoding="async"
          className="w-full h-full object-cover scale-140 filter blur-[56px] saturate-[1.3] opacity-35 dark:opacity-20 transform-gpu"
        />
        {/* Voile de thème préservant la lisibilité stricte WCAG AA */}
        <div className="absolute inset-0 bg-[#f4f1ff]/90 dark:bg-[#0c0a14]/94" />
      </div>

      {/* 
        EN-TÊTE COMPACT AU SCROLL (Fond de verre ultra-opaque pour zéro chevauchement)
        N'apparaît que quand le hero défile hors champ (scrollY > 260px).
      */}
      <header
        style={{
          paddingTop: 'max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.85rem))',
        }}
        className={`fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 pb-3 transition-all duration-300 flex items-center justify-between border-b ${
          showCompactHeader
            ? 'bg-white/95 dark:bg-[#0c0a14]/95 backdrop-blur-2xl border-black/10 dark:border-white/10 shadow-md translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none border-transparent'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onBack();
            }}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1A1A2E] dark:text-white active:scale-90 transition-transform shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm sm:text-base text-[#1A1A2E] dark:text-white truncate">
              {displayEvent.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {displayEvent.city} · {displayEvent.price_min === 0 ? 'Gratuit' : `${displayEvent.price_min.toLocaleString('fr-FR')} FCFA`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Signaler dans l'en-tête compact */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            aria-label="Signaler cet événement"
            title="Signaler cet événement"
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shrink-0 cursor-pointer"
          >
            <Flag className="w-4 h-4 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Partager cet événement"
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shrink-0 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all shrink-0 cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
      </header>

      {/* 
        HERO VISUEL PROGRESSIF (Flou multi-strates & boutons circulaires 44px)
      */}
      <ProgressiveBlurHero
        event={displayEvent as Event}
        coverImage={coverImage}
        galleryCount={galleryImages.length}
        liked={liked}
        isOrganizer={isOrganizer}
        onReport={() => setShowReportModal(true)}
        onBack={() => {
          haptic.light();
          onBack();
        }}
        onLike={handleLike}
        onShare={handleShare}
        onOpenLightbox={(src) => openLightbox(src)}
        onEditEvent={onEditEvent}
        onOpenManage={() => setShowManage(true)}
      />

      {/* 
        FEUILLE DE CONTENU (Bottom Sheet en Verre Liquid Glass)
        Monte avec une courbure 32px sur le hero flouté.
        Padding-bottom de sécurité généreux (pb-44) pour dégager complètement la barre flottante.
      */}
      <main className="-mt-14 sm:-mt-18 relative z-20 max-w-xl mx-auto px-4 sm:px-6 pb-44 sm:pb-48 space-y-5">
        {/* Carte Principale : Identité, Titre, Badges, Compte à rebours, Date/Heure */}
        <section className="p-4 sm:p-6 rounded-[28px] sm:rounded-[32px] glass-ios border border-white/60 dark:border-white/15 space-y-5 shadow-xl">
          {/* Ligne des badges : Catégorie violet plein + Ville en verre + Statut éventuel */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1 rounded-full bg-[#6600FF] text-white text-xs font-black uppercase tracking-wider shadow-sm shadow-[#6600FF]/30">
                {displayEvent.category}
              </span>
              <span className="px-3 py-1 rounded-full glass-ios text-xs font-extrabold text-[#1A1A2E] dark:text-white flex items-center gap-1.5 shadow-2xs">
                <span>{flag}</span>
                <span>{displayEvent.city}</span>
              </span>
            </div>

            {/* Badge de statut du cycle de vie */}
            {statusLabel && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </span>
            )}
          </div>

          {/* Titre de l'événement */}
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A2E] dark:text-white tracking-tight leading-tight">
            {displayEvent.title}
          </h1>

          {/* 
            COMPTE À REBOURS ÉLÉGANT (4 tuiles en verre sombre)
          */}
          <EventCountdown
            days={countdown.days}
            hours={countdown.hours}
            minutes={countdown.minutes}
            seconds={countdown.seconds}
            hasEnded={eventHasEnded}
            isValid={countdown.isValid}
          />

          {/* 
            GRILLE 2 COLONNES DATE + HEURE (Haute lisibilité, zéro chevauchement)
          */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
            {/* Colonne Date */}
            <div className="p-3 sm:p-3.5 rounded-[20px] bg-white dark:bg-[#151126] border border-black/10 dark:border-white/10 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#6600FF]/10 text-[#6600FF] dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6600FF] dark:text-[#A78BFA]">
                  Date
                </span>
              </div>
              <div>
                <p className="text-[13px] sm:text-sm font-black text-zinc-900 dark:text-white leading-tight capitalize truncate">
                  {dateMainText}
                </p>
                <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {dateSubText}
                </p>
              </div>
            </div>

            {/* Colonne Heure */}
            <div className="p-3 sm:p-3.5 rounded-[20px] bg-white dark:bg-[#151126] border border-black/10 dark:border-white/10 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#6600FF]/10 text-[#6600FF] dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6600FF] dark:text-[#A78BFA]">
                  Horaire
                </span>
              </div>
              <div>
                <p className="text-[13px] sm:text-sm font-black text-zinc-900 dark:text-white leading-tight tabular-nums truncate">
                  {timeMainText}
                </p>
                <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {timeSubText}
                </p>
              </div>
            </div>
          </div>

          {/* 
            CARTE LIEU & MINI-CARTE LAZY INTERSECTIONOBSERVER
          */}
          <div className="p-4 sm:p-5 rounded-[24px] glass-ios space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-400">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Lieu & Accès
              </span>
            </div>
            <p className="text-base font-extrabold text-[#1A1A2E] dark:text-white">
              {displayEvent.location_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {flag} {displayEvent.city}
              {displayEvent.location_address ? ` · ${displayEvent.location_address}` : ''}
            </p>

            <EventMapPreview
              locationName={displayEvent.location_name}
              locationAddress={displayEvent.location_address}
              city={displayEvent.city}
              country={displayEvent.country}
              latitude={displayEvent.latitude}
              longitude={displayEvent.longitude}
            />
          </div>

          {/* 
            CONSEILLER IA DE L'ÉVÉNEMENT (Gemini)
          */}
          <EventAIInsights
            event={displayEvent as Event}
            onOpenSettings={onOpenAISettings || (() => {})}
          />

          {/* 
            PASS & BILLETS DISPONIBLES (Avec jauge sous 20% et moyens Flooz / T-Money / MoMo)
          */}
          <EventTicketsList
            event={displayEvent as Event}
            ticketOptions={ticketOptions}
            canBook={canBook}
            onSelectPass={handleSelectPass}
          />

          {/* 
            MÉDIAS, TEASER VIDÉO & GALERIE PHOTO
          */}
          {(videoInfo || galleryImages.length > 1) && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2 text-[#1A1A2E] dark:text-white">
                <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black tracking-tight">
                  Médias & Teaser officiel
                </h2>
              </div>

              {/* Lecteur vidéo intégré */}
              {videoInfo && (
                <div className="rounded-[22px] overflow-hidden border border-black/10 dark:border-white/10 aspect-video bg-black shadow-lg">
                  {videoInfo.isEmbed ? (
                    <iframe
                      src={videoInfo.url}
                      title="Teaser de l'événement"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <video
                      src={videoInfo.url}
                      controls
                      poster={coverImage}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Carrousel de vignettes de photos */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                  {galleryImages.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => openLightbox(index)}
                      className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10 hover:opacity-90 active:scale-95 transition-all cursor-zoom-in relative group"
                      aria-label={`Agrandir la photo ${index + 1}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 
            DESCRIPTION / À PROPOS
          */}
          <div className="pt-2 space-y-2">
            <h2 className="text-base font-black text-[#1A1A2E] dark:text-white">
              À propos de cet événement
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {displayEvent.description}
            </p>
          </div>

          {/* 
            ARTISTES INVITÉS / LINEUP
          */}
          {artists.length > 0 && (
            <div className="pt-2 space-y-3">
              <h2 className="text-base font-black text-[#1A1A2E] dark:text-white">
                Artistes à l'affiche
              </h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {artists.map((artist) => (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => onArtistClick(artist)}
                    className="flex flex-col items-center gap-1.5 w-20 shrink-0 cursor-pointer group text-left focus:outline-hidden"
                  >
                    <div className="relative">
                      <img
                        src={artist.photo_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6600FF]/30 group-hover:ring-[#6600FF] transition-all"
                      />
                      {artist.is_verified && (
                        <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5 shadow-sm">
                          <BadgeCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#1A1A2E] dark:text-white text-center line-clamp-1 w-full">
                      {artist.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 
            ORGANISATEUR
          */}
          {fullEvent?.organizer && (
            <div className="pt-2 space-y-2.5">
              <h2 className="text-base font-black text-[#1A1A2E] dark:text-white">
                Organisateur certifié
              </h2>
              <div className="p-4 rounded-[22px] glass-ios flex items-center gap-3">
                <UserAvatar
                  src={fullEvent.organizer.logo_url}
                  name={fullEvent.organizer.name}
                  role="organizer"
                  size="md"
                  shape="squircle"
                  isVerified={fullEvent.organizer.verification_status === 'verified'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="font-extrabold text-sm text-[#1A1A2E] dark:text-white truncate">
                      {fullEvent.organizer.name}
                    </h3>
                    {fullEvent.organizer.verification_status === 'verified' && (
                      <BadgeCheck className="w-4 h-4 text-[#6600FF] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {fullEvent.organizer.city}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 
            COLLABORATEURS & PARTENAIRES
          */}
          {collaborators.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2 text-[#1A1A2E] dark:text-white">
                <Users className="w-4 h-4 text-[#6600FF] dark:text-purple-400" />
                <h2 className="text-base font-black tracking-tight">
                  Collaborateurs & Partenaires
                </h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-[20px] glass-ios flex items-center gap-2.5 shrink-0 min-w-[140px]"
                  >
                    <UserAvatar
                      src={c.artist?.photo_url || c.organization?.logo_url}
                      name={c.artist?.name || c.organization?.name || 'Partenaire'}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A2E] dark:text-white line-clamp-1">
                        {c.artist?.name || c.organization?.name || 'Partenaire'}
                      </p>
                      <span className="text-[10px] text-gray-500 capitalize">{c.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 
            PARTICIPANTS RÉELS AVEC AMIS EN PRIORITÉ & VUES INTÉGRÉES
          */}
          <EventAttendeesSection
            attendees={attendees}
            totalCount={attendees.length || liveAttendees}
            friendsCount={attendeesFriendsCount}
            viewsCount={liveViews}
            loading={attendeesLoading}
            onOpenModal={() => setShowAttendeesModal(true)}
          />
        </section>

        {/* 
          SECTIONS AUXILIAIRES : Programme, Liens Live, Sponsors & Onglets Communauté
        */}
        <div className="space-y-4">
          <EventSchedule event={displayEvent as Event} onArtistClick={onArtistClick} isDark={isDark} />
          <EventLiveLinks event={displayEvent as Event} isDark={isDark} />
          <EventSponsors event={displayEvent as Event} isDark={isDark} />
          <EventInteractionPanel event={displayEvent as Event} isOrganizer={isOrganizer} onToast={onToast} />
        </div>
      </main>

      {/* 
        CAPSULE DE VERRE FLOTTANTE D'ACHAT (Barre inférieure fixe décollée des bords)
        Positionnée avec marge basse et safe-area. Le padding-bottom du contenu (pb-44)
        garantit qu'aucun élément ne sera masqué derrière elle !
      */}
      <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 p-3.5 sm:p-4 glass-floating-bar flex items-center justify-between gap-4 shadow-2xl">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            À partir de
          </p>
          <p className="text-lg sm:text-xl font-black text-[#1A1A2E] dark:text-white tracking-tight">
            {displayEvent.price_min === 0
              ? 'Gratuit'
              : `${displayEvent.price_min.toLocaleString('fr-FR')} FCFA`}
          </p>
        </div>

        <button
          type="button"
          disabled={!canBook}
          onClick={() => {
            haptic.selection();
            setSelectedTicketOptionId(null);
            setShowBooking(true);
            onBook?.(displayEvent as Event);
          }}
          className="min-h-[44px] px-6 sm:px-7 py-3 rounded-full bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#6600FF]/35 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <Ticket className="w-4 h-4" />
          <span>{canBook ? 'Prendre un billet' : statusLabel || 'Indisponible'}</span>
        </button>
      </div>

      {/* MODALS : Signalement, Participants réels, Réservation, Gestion, Lightbox et Partage */}
      <EventReportModal
        isOpen={showReportModal}
        eventTitle={displayEvent.title}
        onClose={() => setShowReportModal(false)}
        onReportSubmitted={() => {
          haptic.success();
          onToast({
            message: 'Signalement transmis à l’équipe de modération (TODO / Démonstration)',
            type: 'info',
          });
        }}
      />

      <EventAttendeesModal
        isOpen={showAttendeesModal}
        eventTitle={displayEvent.title}
        attendees={attendees}
        friendsCount={attendeesFriendsCount}
        onClose={() => setShowAttendeesModal(false)}
        onSelectProfile={handleSelectAttendeeProfile}
        onToggleFollow={handleToggleFollowAttendee}
      />

      <BookingModal
        open={showBooking}
        event={displayEvent as Event}
        initialOptionId={selectedTicketOptionId}
        onClose={() => setShowBooking(false)}
        onSuccess={(qrCode) => {
          onToast({ message: `Billet réservé ! Code: ${qrCode}`, type: 'success' });
        }}
      />

      {isOrganizer && (
        <EventManagementModal
          event={showManage ? (displayEvent as Event) : null}
          onClose={() => setShowManage(false)}
          onToast={onToast}
        />
      )}

      {lightboxState?.open && (
        <Lightbox
          images={galleryImages}
          initialIndex={lightboxState.initialIndex}
          alt={displayEvent.title}
          eventTitle={displayEvent.title}
          eventDate={formattedDate}
          eventLocation={[displayEvent.venue_name || displayEvent.location, displayEvent.city].filter(Boolean).join(' • ')}
          onClose={() => setLightboxState(null)}
          onToast={onToast}
        />
      )}

      <ShareModal
        isOpen={showShareModal}
        event={displayEvent as Event}
        onClose={() => setShowShareModal(false)}
        onToast={onToast}
      />
    </div>
  );
}
