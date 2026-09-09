import { useState, useEffect } from 'react';
import {
  ChevronLeft, Share2, Heart, MapPin, Calendar, Clock,
  Star, BadgeCheck, Ticket, Settings, Eye,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchEventById, fetchCollaborators, incrementEventViews, subscribeToEventViews, subscribeToEventAttendees, isEventTerminated } from '@/services/events';
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
import type { Event, EventWithRelations, Artist, EventCollaborator } from '@/types';
import type { ToastData } from '@/components/Toast';

interface EventDetailScreenProps {
  event: Event;
  onBack: () => void;
  onArtistClick: (artist: Artist) => void;
  onBook: (event: Event) => void;
  onOpenAISettings?: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
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

export function EventDetailScreen({ event, onBack, onArtistClick, onOpenAISettings, onToast }: EventDetailScreenProps) {
  const { t, language, user } = useApp();
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const [fullEvent, setFullEvent] = useState<EventWithRelations | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
  const [liveViews, setLiveViews] = useState<number>(event.views_count || 0);
  const [liveAttendees, setLiveAttendees] = useState<number>(event.attendees_count || 0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const countdown = useCountdown(event.starts_at);

  const handleShare = async () => {
    const shareData = { title: displayEvent.title, text: `Découvrez ${displayEvent.title} sur Gbaigbance`, url: window.location.href };
    try {
      const nativeShare = typeof navigator.share === 'function';
      if (nativeShare) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      onToast({ message: nativeShare ? 'Événement partagé' : 'Lien copié', type: 'success' });
    } catch {
      // L'utilisateur peut fermer la feuille de partage sans que ce soit une erreur.
    }
  };

  useEffect(() => {
    setFullEvent(null);
    fetchEventById(event.id)
      .then((data) => {
        if (data && data.id === event.id) {
          setFullEvent(data);
          setLiveViews(data.views_count || 0);
          setLiveAttendees(data.attendees_count || 0);
        }
      })
      .catch(() => setFullEvent(null));

    fetchCollaborators(event.id).then(setCollaborators).catch(() => {});
    incrementEventViews(event.id).catch(() => {});
    const unsubViews = subscribeToEventViews(event.id, setLiveViews);
    const unsubAttendees = subscribeToEventAttendees(event.id, setLiveAttendees);
    return () => { unsubViews(); unsubAttendees(); };
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

  const displayEvent = (fullEvent && fullEvent.id === event.id) ? fullEvent : event;
  const artists = (displayEvent as EventWithRelations)?.event_artists?.map((ea) => ea.artist) || [];
  const flag = COUNTRY_FLAGS[displayEvent.country || event.country] || '';
  const isOrganizer = !!(user && displayEvent.organizer_user_id === user.id);
  const eventHasEnded = isEventTerminated(displayEvent as Event);
  const canBook = displayEvent.status === 'published' && !eventHasEnded;
  const statusLabel = displayEvent.status === 'paused' ? 'Ventes en pause' : displayEvent.status === 'suspended' ? 'Événement suspendu' : displayEvent.status === 'cancelled' ? 'Événement annulé' : displayEvent.status === 'completed' || eventHasEnded ? 'Événement terminé' : null;
  const galleryImages = Array.from(new Set([displayEvent.cover_url, ...(displayEvent.images || [])].filter((image): image is string => Boolean(image))));
  const coverImage = galleryImages[0] || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <div className="min-h-screen pb-32">
      <div className="relative h-[24rem]">
        <button type="button" onClick={() => setLightboxSrc(coverImage)} className="absolute inset-0 z-0 cursor-zoom-in" aria-label="Ouvrir la galerie"><img src={coverImage} alt={displayEvent.title} className="w-full h-full object-cover" /></button>
        <div className="absolute inset-0 bg-gradient-to-t from-[#EDE8FF] via-transparent to-black/20" />
        <div className="absolute top-4 left-0 right-0 px-5 flex items-center justify-between">
          <button onClick={onBack} aria-label="Retour" className="w-10 h-10 rounded-full glass-surface flex items-center justify-center shadow-md active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5 text-[#171726]" /></button>
          <div className="flex gap-2">
            {isOrganizer && <button onClick={() => setShowManage(true)} aria-label="Gérer l’événement" className="w-10 h-10 rounded-full glass-surface flex items-center justify-center shadow-md active:scale-90 transition-transform"><Settings className="w-5 h-5 text-[#171726]" /></button>}
            <button onClick={handleShare} aria-label="Partager l’événement" className="w-10 h-10 rounded-full glass-surface flex items-center justify-center shadow-md active:scale-90 transition-transform"><Share2 className="w-5 h-5 text-[#171726]" /></button>
            <button onClick={handleLike} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'} className="w-10 h-10 rounded-full glass-surface flex items-center justify-center shadow-md active:scale-90 transition-transform"><Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-[#171726]'}`} /></button>
          </div>
        </div>
        <div className="absolute bottom-20 left-5 flex items-center gap-2"><span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#6600FF] text-white shadow-purple">{t('events', `categories.${event.category}`)}</span>{galleryImages.length > 1 && <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">{galleryImages.length} photos</span>}</div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-8 relative">
        <div className="animate-slide-up">
          {statusLabel && <div className="mb-3 inline-flex items-center px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{statusLabel}</div>}
          <div className="flex items-center gap-2 mb-1"><div className="rating-badge text-[#1A1A2E]"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />4.8</div><span className="text-xs text-gray-500">· 234 avis</span></div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] leading-tight">{displayEvent.title}</h1>
        </div>

        <div className="card-dark mt-4 p-4">
          <p className="text-xs text-white/60 uppercase tracking-wider mb-3 font-semibold">Compte à rebours</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ label: 'Jours', value: countdown.days }, { label: 'Heures', value: countdown.hours }, { label: 'Min', value: countdown.minutes }, { label: 'Sec', value: countdown.seconds }].map((unit) => (
              <div key={unit.label} className="countdown-box text-center py-2.5"><p className="text-2xl font-extrabold text-white tabular-nums">{String(unit.value).padStart(2, '0')}</p><p className="text-[10px] text-white/60 uppercase mt-0.5">{unit.label}</p></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="card p-4"><div className="flex items-center gap-2 text-[#6600FF] mb-1.5"><Calendar className="w-5 h-5" /><span className="text-xs font-semibold uppercase text-gray-500">Date</span></div><p className="text-sm font-bold text-[#1A1A2E]">{formatFullDate(displayEvent.starts_at, language)}</p></div>
          <div className="card p-4"><div className="flex items-center gap-2 text-[#6600FF] mb-1.5"><Clock className="w-5 h-5" /><span className="text-xs font-semibold uppercase text-gray-500">Heure</span></div><p className="text-sm font-bold text-[#1A1A2E]">{formatTime(displayEvent.starts_at)}</p></div>
        </div>

        <div className="card p-4 mt-3">
          <div className="flex items-center gap-2 text-[#6600FF] mb-1.5"><MapPin className="w-5 h-5" /><span className="text-xs font-semibold uppercase text-gray-500">Lieu</span></div>
          <p className="text-base font-bold text-[#1A1A2E]">{displayEvent.location_name}</p>
          <p className="text-sm text-gray-500">{flag} {displayEvent.city}{displayEvent.location_address ? ` · ${displayEvent.location_address}` : ''}</p>
          <EventMapPreview
            locationName={displayEvent.location_name}
            locationAddress={displayEvent.location_address}
            city={displayEvent.city}
            country={displayEvent.country}
            latitude={displayEvent.latitude}
            longitude={displayEvent.longitude}
          />
        </div>

        <div className="mt-3">
          <EventAIInsights
            event={displayEvent as Event}
            onOpenSettings={onOpenAISettings || (() => {})}
          />
        </div>

        {galleryImages.length > 1 && <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">{galleryImages.map((image, index) => <button type="button" key={image} onClick={() => setLightboxSrc(image)} className="h-16 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10" aria-label={`Voir la photo ${index + 1}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}
        <div className="mt-5"><h2 className="text-lg font-bold text-[#1A1A2E] mb-2">À propos</h2><p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{displayEvent.description}</p></div>

        {artists.length > 0 && (
          <div className="mt-5"><h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Artistes</h2><div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">{artists.map((artist) => (<div key={artist.id} onClick={() => onArtistClick(artist)} className="flex flex-col items-center gap-2 w-20 shrink-0 cursor-pointer group"><div className="relative"><img src={artist.photo_url || ''} alt={artist.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6600FF]/30 group-hover:ring-[#6600FF] transition-all" />{artist.is_verified && <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5"><BadgeCheck className="w-3.5 h-3.5 text-white" /></div>}</div><span className="text-xs font-semibold text-[#1A1A2E] text-center line-clamp-1 w-full">{artist.name}</span></div>))}</div></div>
        )}

        {fullEvent?.organizer && (
          <div className="mt-5"><h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Organisateur</h2><div className="card p-4 flex items-center gap-3"><img src={fullEvent.organizer.logo_url || ''} alt="" className="w-12 h-12 rounded-2xl object-cover" /><div className="flex-1"><div className="flex items-center gap-1"><h3 className="font-bold text-[#1A1A2E]">{fullEvent.organizer.name}</h3>{fullEvent.organizer.verification_status === 'verified' && <BadgeCheck className="w-4 h-4 text-[#6600FF]" />}</div><p className="text-xs text-gray-500">{fullEvent.organizer.city}</p></div></div></div>
        )}

        <div className="card p-4 mt-3 flex items-center gap-3">
          <div className="flex -space-x-2">{collaborators.filter((c) => c.status === 'accepted').slice(0, 3).map((c) => (<img key={c.id} src={c.profile?.avatar_url || `https://i.pravatar.cc/100?u=${c.user_id}`} alt="" className="w-8 h-8 rounded-full border-2 border-white" />))}{collaborators.filter((c) => c.status === 'accepted').length === 0 && ([1,2,3].map((i) => (<img key={i} src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" className="w-8 h-8 rounded-full border-2 border-white" />)))}</div>
          <p className="text-sm text-gray-600"><span className="font-bold text-[#1A1A2E]">{formatNumber(liveAttendees, language)}</span> {t('settings', 'views.participants')}</p>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500"><Eye className="w-4 h-4 text-[#6600FF]" /><span className="font-bold text-[#1A1A2E] tabular-nums animate-pop">{formatNumber(liveViews, language)}</span><span>{t('settings', 'views.views')}</span></div>
        </div>

        {collaborators.length > 0 && (
          <div className="mt-5"><h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Collaborateurs</h2><div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">{collaborators.map((c) => (<div key={c.id} className="flex flex-col items-center gap-2 w-20 shrink-0"><div className="relative"><img src={c.profile?.avatar_url || c.artist?.photo_url || `https://i.pravatar.cc/100?u=${c.user_id}`} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6600FF]/30" />{c.status === 'pending' && <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5"><Clock className="w-3 h-3 text-white" /></div>}</div><span className="text-xs font-semibold text-[#1A1A2E] text-center line-clamp-1 w-full">{c.profile?.name || c.artist?.name || 'Inconnu'}</span><span className="text-[10px] text-gray-500 capitalize">{c.role === 'co_organizer' ? 'Co-org.' : c.role === 'performer' ? 'Artiste' : c.role}</span></div>))}</div></div>
        )}
      </div>

      <div className="max-w-md mx-auto px-5"><EventSchedule event={displayEvent as Event} onArtistClick={onArtistClick} /></div>
      <div className="max-w-md mx-auto px-5"><EventLiveLinks event={displayEvent as Event} /></div>
      <div className="max-w-md mx-auto px-5"><EventSponsors event={displayEvent as Event} /></div>
      <div className="max-w-md mx-auto px-5 mt-6"><EventInteractionPanel event={displayEvent as Event} isOrganizer={isOrganizer} onToast={onToast} /></div>

      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-5 pt-3 bg-gradient-to-t from-[#EDE8FF] via-[#EDE8FF] to-transparent">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div><p className="text-xs text-gray-500">À partir de</p><p className="text-xl font-extrabold text-[#1A1A2E]">{displayEvent.price_min === 0 ? 'Gratuit' : `${displayEvent.price_min.toLocaleString('fr-FR')} FCFA`}</p></div>
          <button
            type="button"
            disabled={!canBook}
            onClick={() => setShowBooking(true)}
            className="btn-purple flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Ticket className="w-5 h-5" />
            {canBook ? 'Acheter un billet' : statusLabel || 'Réservation indisponible'}
          </button>
        </div>
      </div>

      <BookingModal open={showBooking} event={displayEvent as Event} onClose={() => setShowBooking(false)} onSuccess={(qrCode) => { onToast({ message: `Billet réservé ! Code: ${qrCode}`, type: 'success' }); }} />
      {isOrganizer && <EventManagementModal event={showManage ? (displayEvent as Event) : null} onClose={() => setShowManage(false)} onToast={onToast} />}
      {lightboxSrc && <Lightbox src={lightboxSrc} alt={displayEvent.title} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
