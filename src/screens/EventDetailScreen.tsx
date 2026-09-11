import { useState, useEffect } from 'react';
import {
  ChevronLeft, Share2, Heart, MapPin, Calendar, Clock,
  BadgeCheck, Ticket, Settings, Eye, Film, Edit3,
  CheckCircle2, AlertTriangle, Users
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import {
  fetchEventById,
  fetchCollaborators,
  fetchTicketOptions,
  incrementEventViews,
  subscribeToEventViews,
  subscribeToEventAttendees,
  isEventTerminated
} from '@/services/events';
import { getPublicEventCache, setPublicEventCache } from '@/services/cache';
import { useFavorites } from '@/contexts/FavoritesContext';
import { formatFullDate, formatTime, formatNumber } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import { BookingModal } from '@/components/BookingModal';
import { EventMapPreview } from '@/components/EventMapPreview';
import { EventAIInsights } from '@/components/EventAIInsights';
import { EventInteractionPanel } from '@/components/EventInteractionPanel';
import { EventSchedule } from '@/components/EventSchedule';
import { EventLiveLinks } from '@/components/EventLiveLinks';
import { EventSponsors } from '@/components/EventSponsors';
import { EventManagementModal } from '@/components/EventManagementModal';
import { Lightbox } from '@/components/Lightbox';
import { ShareModal } from '@/components/ShareModal';
import { shareEventNative } from '@/utils/share';
import { UserAvatar } from '@/components/UserAvatar';
import type { Event, EventWithRelations, Artist, EventCollaborator, TicketOption } from '@/types';
import type { ToastData } from '@/components/Toast';

interface EventDetailScreenProps {
  event: Event;
  onBack: () => void;
  onArtistClick: (artist: Artist) => void;
  onBook: (event: Event) => void;
  onEditEvent?: (event: Event) => void;
  onOpenAISettings?: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
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
  onEditEvent,
  onOpenAISettings,
  onToast,
}: EventDetailScreenProps) {
  const { t, language, user, theme } = useApp();
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const [fullEvent, setFullEvent] = useState<EventWithRelations | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedTicketOptionId, setSelectedTicketOptionId] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [liveViews, setLiveViews] = useState<number>(event.views_count || 0);
  const [liveAttendees, setLiveAttendees] = useState<number>(event.attendees_count || 0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const countdown = useCountdown(event.starts_at);

  const handleShare = async () => {
    const status = await shareEventNative(displayEvent, onToast);
    if (status !== 'shared' && status !== 'cancelled') {
      setShowShareModal(true);
    }
  };

  useEffect(() => {
    // 1. Instant paint from IndexedDB cache if available
    getPublicEventCache(event.id).then(({ data: cached }) => {
      if (cached && cached.id === event.id) {
        setFullEvent((curr) => curr || cached);
      }
    });

    // 2. Fresh network fetch
    fetchEventById(event.id)
      .then((data) => {
        if (data && data.id === event.id) {
          setFullEvent(data);
          setLiveViews(data.views_count || 0);
          setLiveAttendees(data.attendees_count || 0);
          setPublicEventCache(event.id, data);
        }
      })
      .catch(() => {});

    fetchCollaborators(event.id).then(setCollaborators).catch(() => {});
    fetchTicketOptions(event.id).then(setTicketOptions).catch(() => {});
    incrementEventViews(event.id).catch(() => {});

    const unsubViews = subscribeToEventViews(event.id, setLiveViews);
    const unsubAttendees = subscribeToEventAttendees(event.id, setLiveAttendees);
    return () => {
      unsubViews();
      unsubAttendees();
    };
  }, [event.id]);

  const handleLike = async () => {
    try {
      const willBeLiked = !liked;
      await toggleLike(event.id);
      onToast({
        message: willBeLiked ? 'Ajouté aux favoris' : 'Retiré des favoris',
        type: 'success',
      });
    } catch {
      onToast({ message: 'Erreur lors de la mise à jour', type: 'error' });
    }
  };

  const displayEvent = fullEvent && fullEvent.id === event.id ? fullEvent : event;
  const isDark = theme === 'dark';

  // Safe extraction of artists
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

  const videoInfo = getVideoEmbedUrl(displayEvent.video_url);

  const handleSelectPass = (optionId: string) => {
    setSelectedTicketOptionId(optionId);
    setShowBooking(true);
  };

  return (
    <div className="min-h-screen pb-36 bg-gray-50 dark:bg-[#0C0A13]">
      {/* Hero Header with full cover backdrop */}
      <div className="relative h-[24rem] sm:h-[28rem] overflow-hidden bg-black">
        <button
          type="button"
          onClick={() => setLightboxSrc(coverImage)}
          className="absolute inset-0 z-0 cursor-zoom-in block w-full h-full"
          aria-label="Ouvrir la photo en plein écran"
        >
          <img
            src={coverImage}
            alt={displayEvent.title}
            className="w-full h-full object-cover scale-[1.02] filter brightness-95"
          />
        </button>

        {/* Ambient Top & Bottom Blurs */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Top iOS Floating Navigation Bar */}
        <div className="absolute top-4 left-0 right-0 px-5 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2">
            {isOrganizer && onEditEvent && (
              <button
                type="button"
                onClick={() => onEditEvent(displayEvent as Event)}
                aria-label="Modifier l’événement"
                className="h-10 px-3.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center gap-1.5 text-white text-xs font-bold shadow-lg active:scale-95 transition-transform cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            {isOrganizer && (
              <button
                type="button"
                onClick={() => setShowManage(true)}
                aria-label="Gérer l’événement"
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform cursor-pointer"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager l’événement"
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform cursor-pointer"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>

            <button
              type="button"
              onClick={handleLike}
              aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform cursor-pointer"
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Frosted Glass Overlapping Card (Aesthetic Revert to blurred iOS Glass) */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 relative z-10 -mt-12 sm:-mt-16">
        <div className="rounded-t-[32px] sm:rounded-t-[40px] bg-white/85 dark:bg-[#12101F]/85 backdrop-blur-2xl border-t border-x border-white/60 dark:border-white/10 shadow-2xl p-5 sm:p-7 space-y-5">
          
          {/* Top Metadata Capsule Row: Category, City, Photos count (No rating/reviews) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#6600FF] text-white shadow-sm shadow-[#6600FF]/30 tracking-wide uppercase">
                {t('events', `categories.${event.category}`)}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/[0.05] dark:bg-white/[0.08] text-[#17131D] dark:text-gray-200 border border-black/[0.04] dark:border-white/[0.06]">
                {flag} {displayEvent.city}
              </span>
            </div>

            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxSrc(coverImage)}
                className="rounded-full bg-black/[0.06] dark:bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-black/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-400" />
                <span>{galleryImages.length} photos</span>
              </button>
            )}
          </div>

          {/* Lifecycle Alert if not published */}
          {statusLabel && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>{statusLabel}</span>
            </div>
          )}

          {/* Event Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-[#17131D] dark:text-white leading-tight tracking-tight">
            {displayEvent.title}
          </h1>

          {/* Minimalist Apple Glass Countdown Bar (Without "COMPTE À REBOURS" headline) */}
          {!eventHasEnded && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171328] via-[#211B38] to-[#171328] text-white shadow-md border border-white/10">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Jours', value: countdown.days },
                  { label: 'Heures', value: countdown.hours },
                  { label: 'Min', value: countdown.minutes },
                  { label: 'Sec', value: countdown.seconds },
                ].map((unit) => (
                  <div key={unit.label} className="py-2 px-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                    <p className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                      {String(unit.value).padStart(2, '0')}
                    </p>
                    <p className="text-[10px] font-bold text-purple-200/70 uppercase mt-0.5 tracking-wider">
                      {unit.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Heure Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Date de l'événement
                </p>
                <p className="text-xs sm:text-sm font-bold text-[#17131D] dark:text-white capitalize truncate">
                  {formatFullDate(displayEvent.starts_at, language)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Heure
                </p>
                <p className="text-xs sm:text-sm font-bold text-[#17131D] dark:text-white truncate">
                  {formatTime(displayEvent.starts_at)}
                  {displayEvent.ends_at ? ` - ${formatTime(displayEvent.ends_at)}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Location & Interactive Map Preview */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-[#6600FF] dark:text-purple-400">
              <MapPin className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Lieu
              </span>
            </div>
            <p className="text-base font-bold text-[#17131D] dark:text-white">
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

          {/* AI Insights Capsule */}
          <div>
            <EventAIInsights
              event={displayEvent as Event}
              onOpenSettings={onOpenAISettings || (() => {})}
            />
          </div>

          {/* Pass & Billets disponibles (High Priority section) */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#17131D] dark:text-white">
                <Ticket className="w-5 h-5 text-[#6600FF] dark:text-purple-400" />
                <h2 className="text-base font-black tracking-tight">
                  Pass & Billets disponibles
                </h2>
              </div>
              <span className="text-xs font-bold text-gray-400">
                {ticketOptions.length} formule{ticketOptions.length > 1 ? 's' : ''}
              </span>
            </div>

            {ticketOptions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-dashed border-black/10 dark:border-white/10 text-center">
                <p className="text-xs font-bold text-gray-500">
                  Tarif standard : {displayEvent.price_min === 0 ? 'Gratuit' : `${displayEvent.price_min.toLocaleString('fr-FR')} FCFA`}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ticketOptions.map((opt) => {
                  const remaining = Math.max(0, opt.quantity_total - opt.quantity_sold);
                  const isSoldOut = remaining <= 0;

                  return (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSoldOut
                          ? 'bg-gray-100/60 dark:bg-white/[0.02] border-black/[0.05] opacity-60'
                          : 'bg-white dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] hover:border-[#6600FF]/50 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#17131D] dark:text-white">
                              {opt.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                              {opt.ticket_type}
                            </span>
                          </div>

                          {opt.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                              {opt.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-[#17131D] dark:text-white">
                            {opt.price === 0 ? 'Gratuit' : `${opt.price.toLocaleString('fr-FR')} FCFA`}
                          </p>
                        </div>
                      </div>

                      {/* Quota & Action Bar */}
                      <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isSoldOut ? (
                            <span className="text-xs font-bold text-red-500">Épuisé</span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{remaining} place{remaining > 1 ? 's' : ''} disponible{remaining > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={!canBook || isSoldOut}
                          onClick={() => handleSelectPass(opt.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#6600FF] text-white text-xs font-bold hover:bg-[#5200cc] transition-all shadow-xs disabled:opacity-40 cursor-pointer active:scale-95"
                        >
                          {isSoldOut ? 'Épuisé' : 'Réserver ce pass'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pre-season Video Teaser & Media Section */}
          {(videoInfo || galleryImages.length > 1) && (
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-2 text-[#17131D] dark:text-white">
                <Film className="w-5 h-5 text-[#6600FF] dark:text-purple-400" />
                <h2 className="text-base font-black tracking-tight">
                  Médias & Teaser (Pré-saison)
                </h2>
              </div>

              {/* Video Teaser Embed */}
              {videoInfo && (
                <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] aspect-video bg-black relative shadow-lg">
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

              {/* Multiple Gallery Photos Thumbnail Scroll */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                  {galleryImages.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setLightboxSrc(image)}
                      className="h-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10 hover:opacity-90 active:scale-95 transition-all cursor-zoom-in relative group"
                      aria-label={`Voir la photo ${index + 1}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description Section */}
          <div className="pt-2 space-y-2">
            <h2 className="text-base font-black text-[#17131D] dark:text-white">À propos</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {displayEvent.description}
            </p>
          </div>

          {/* Artists Section */}
          {artists.length > 0 && (
            <div className="pt-2 space-y-3">
              <h2 className="text-base font-black text-[#17131D] dark:text-white">Artistes invités</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => onArtistClick(artist)}
                    className="flex flex-col items-center gap-1.5 w-20 shrink-0 cursor-pointer group"
                  >
                    <div className="relative">
                      <img
                        src={artist.photo_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6600FF]/30 group-hover:ring-[#6600FF] transition-all"
                      />
                      {artist.is_verified && (
                        <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#17131D] dark:text-white text-center line-clamp-1 w-full">
                      {artist.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organizer card */}
          {fullEvent?.organizer && (
            <div className="pt-2 space-y-3">
              <h2 className="text-base font-black text-[#17131D] dark:text-white">Organisateur</h2>
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center gap-3">
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
                    <h3 className="font-bold text-sm text-[#17131D] dark:text-white truncate">
                      {fullEvent.organizer.name}
                    </h3>
                    {fullEvent.organizer.verification_status === 'verified' && (
                      <BadgeCheck className="w-4 h-4 text-[#6600FF] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fullEvent.organizer.city}</p>
                </div>
              </div>
            </div>
          )}

          {/* Collaborators & Partners Section */}
          {collaborators.length > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2 text-[#17131D] dark:text-white">
                <Users className="w-5 h-5 text-[#6600FF] dark:text-purple-400" />
                <h2 className="text-base font-black tracking-tight">Collaborateurs & Partenaires</h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center gap-2.5 shrink-0 min-w-[140px]"
                  >
                    <UserAvatar
                      src={c.artist?.photo_url || c.organization?.logo_url}
                      name={c.artist?.name || c.organization?.name || 'Partenaire'}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#17131D] dark:text-white line-clamp-1">
                        {c.artist?.name || c.organization?.name || 'Partenaire'}
                      </p>
                      <span className="text-[10px] text-gray-500 capitalize">{c.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendees & Views Stats pill */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Users className="w-4 h-4 text-[#6600FF]" />
              <span>
                <strong className="text-[#17131D] dark:text-white">{formatNumber(liveAttendees, language)}</strong> participants
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Eye className="w-4 h-4 text-[#6600FF]" />
              <strong className="text-[#17131D] dark:text-white tabular-nums">{formatNumber(liveViews, language)}</strong> vues
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Sections */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-4 mt-4">
        <EventSchedule event={displayEvent as Event} onArtistClick={onArtistClick} isDark={isDark} />
        <EventLiveLinks event={displayEvent as Event} isDark={isDark} />
        <EventSponsors event={displayEvent as Event} isDark={isDark} />
        <EventInteractionPanel event={displayEvent as Event} isOrganizer={isOrganizer} onToast={onToast} />
      </div>

      {/* Floating Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-6 pt-3 bg-white/90 dark:bg-[#12101F]/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              À partir de
            </p>
            <p className="text-xl font-black text-[#17131D] dark:text-white">
              {displayEvent.price_min === 0 ? 'Gratuit' : `${displayEvent.price_min.toLocaleString('fr-FR')} FCFA`}
            </p>
          </div>

          <button
            type="button"
            disabled={!canBook}
            onClick={() => {
              setSelectedTicketOptionId(null);
              setShowBooking(true);
            }}
            className="px-6 py-3.5 rounded-full bg-[#6600FF] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#5200cc] transition-all shadow-md shadow-[#6600FF]/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>{canBook ? 'Prendre un billet' : statusLabel || 'Indisponible'}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
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

      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt={displayEvent.title}
          onClose={() => setLightboxSrc(null)}
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
