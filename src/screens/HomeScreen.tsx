import { useState, useEffect } from 'react';
import {
  Search, Star, TrendingUp, Clock, Users, MapPin,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Sparkles, Calendar, ChevronRight, Zap, Building2, Ticket as TicketIcon,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { TrendingDeck } from '@/components/TrendingDeck';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { NotificationBell } from '@/components/NotificationBell';
import { LocationModal } from '@/components/LocationModal';
import { useApp } from '@/hooks/useApp';
import { COUNTRY_FLAGS, EVENT_CATEGORIES } from '@/constants';
import { formatNumber } from '@/utils/format';
import type { ToastData } from '@/components/Toast';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchPlatformStats,
} from '@/services/events';
import type { Event, Artist, EventCategory } from '@/types';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater, Landmark, Lock,
};

interface HomeScreenProps {
  onEventClick: (event: Event) => void;
  onSearchClick: () => void;
  onOpenNotifications: () => void;
  onProfileClick: () => void;
  onArtistClick?: (artist: Artist) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function HomeScreen({ onEventClick, onSearchClick, onOpenNotifications, onProfileClick, onArtistClick, onBookEvent }: HomeScreenProps & { onBookEvent?: (event: Event) => void }) {
  const { user, t } = useApp();
  const [locationOpen, setLocationOpen] = useState(false);
  const [trending, setTrending] = useState<Event[]>([]);
  const [nearby, setNearby] = useState<Event[]>([]);
  const [featured, setFeatured] = useState<Event[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [categoryEvents, setCategoryEvents] = useState<Event[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<{ totalEvents: number; totalArtists: number; totalOrganizers: number; totalTickets: number; totalParticipants: number } | null>(null);
  useEffect(() => {
    Promise.all([fetchFeaturedEvents(), fetchUpcomingEvents(), fetchTrendingEvents(), fetchFeaturedArtists()])
      .then(([feat, up, trend, art]) => { setFeatured(feat.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at) > new Date()).slice(0, 5)); setTrending(trend.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at) > new Date()).slice(0, 5)); setNearby(up.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at) > new Date())); setArtists(art.slice(0, 6)); })
      .catch(() => {}).finally(() => setLoading(false));
    fetchPlatformStats().then(setPlatformStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCategory) { setCategoryEvents([]); return; }
    setCategoryLoading(true);
    fetchEventsByCategory(selectedCategory).then(setCategoryEvents).catch(() => setCategoryEvents([])).finally(() => setCategoryLoading(false));
  }, [selectedCategory]);

  const heroEvent = featured[0] || trending[0];

  return (
+   <div className="min-h-screen pb-32 bg-lavender">
    {/* En-tête */}
    <div className="px-5 pt-6 pb-2">
  {/* Logo */}
  <div className="flex items-center gap-2 mb-5">
    <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 flex items-center justify-center text-base">
      🎟️
    </div>
    <div className="leading-none">
      <p className="text-[15px] font-extrabold text-[#171726] tracking-tight">GBAIGBANCE</p>
      <p className="text-[9px] font-bold text-gray-400 tracking-[0.16em] uppercase mt-0.5">Billetterie & événements</p>
    </div>
  </div>

  {/* Greeting */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-extrabold text-[#171726] tracking-tight">
        {new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'} {user?.name?.split(' ')[0] || 'Invité'} 👋
      </h1>
      <p className="text-sm text-gray-400 mt-0.5">Trouve ta prochaine sortie</p>
    </div>
    <div className="flex items-center gap-2.5">
      <NotificationBell onOpen={onOpenNotifications} />
      <button onClick={onProfileClick} className="w-10 h-10 rounded-full ring-2 ring-[#6600FF]/20 overflow-hidden bg-[#6600FF]/10 shadow-md active:scale-90 transition-transform" aria-label="Profil">
        {user?.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-sm font-extrabold text-[#6600FF]">{user?.name?.charAt(0).toUpperCase() || '?'}</span>}
      </button>
    </div>
  </div>

  {/* Recherche */}
  <div className="flex items-center gap-2.5">
    <button onClick={onSearchClick} className="flex-1">
      <div className="search-bar flex items-center gap-3 px-5 py-4 text-left">
        <Search className="w-5 h-5 text-[#6600FF]/70" />
        <span className="text-sm text-gray-500">Rechercher un événement, un artiste...</span>
      </div>
    </button>
    <button onClick={() => setLocationOpen(true)} className="w-[3.25rem] h-[3.25rem] shrink-0 rounded-2xl bg-white/90 shadow-md flex items-center justify-center active:scale-90 transition-transform text-lg" aria-label="Localisation">
      {COUNTRY_FLAGS[user?.country || 'TG'] || '🌍'}
    </button>
  </div>
</div>


      {!loading && heroEvent && (
        <section className="mt-4 px-5">
          <div onClick={() => onEventClick(heroEvent)} className="relative h-60 rounded-[2rem] overflow-hidden cursor-pointer group animate-slide-up shadow-[0_20px_45px_rgba(37,20,72,0.2)]">
            <img src={heroEvent.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={heroEvent.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/18 backdrop-blur-xl border border-white/25 shadow-lg"><Sparkles className="w-3.5 h-3.5 text-white" /><span className="text-xs font-bold text-white">À la une</span></div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-xl border border-white/15"><span className="w-2 h-2 bg-[#ff5b66] rounded-full animate-pulse" /><span className="text-xs font-bold text-white">Tendance</span></div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2"><span className="text-xs text-white/90 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full font-medium">{t('events', `categories.${heroEvent.category}`)}</span><span className="flex items-center gap-1 text-xs text-white/80"><MapPin className="w-3 h-3" />{heroEvent.city}</span></div>
              <h2 className="text-white font-extrabold text-xl leading-tight line-clamp-2">{heroEvent.title}</h2>
              <div className="flex items-center justify-between mt-3"><span className="text-lg font-extrabold text-white">{heroEvent.price_min === 0 ? 'Gratuit' : `Dès ${heroEvent.price_min.toLocaleString('fr-FR')} FCFA`}</span><div className="flex items-center gap-1.5 text-white/80 text-sm"><Users className="w-4 h-4" /><span>{heroEvent.attendees_count > 1000 ? `${(heroEvent.attendees_count / 1000).toFixed(1)}K` : heroEvent.attendees_count}</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div></div>
            </div>
          </div>
          {featured.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1" aria-label="Autres événements à la une">
              {featured.slice(1).map((event) => (
                <button key={event.id} type="button" onClick={() => onEventClick(event)} className="flex min-w-[15rem] items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-2 text-left shadow-sm backdrop-blur transition-transform active:scale-[0.98]">
                  <img src={event.cover_url || event.images?.[0] || ''} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#171726]">{event.title}</span><span className="mt-1 block text-xs text-gray-500">{new Date(event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {event.city}</span></span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-6">
  <h2 className="px-5 text-lg font-bold text-[#171726] mb-3">Explorer par catégorie</h2>
  <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pb-1 snap-x snap-mandatory">
    {EVENT_CATEGORIES.map((cat) => {
      const Icon = CATEGORY_ICONS[cat.icon] || Music;
      const isActive = selectedCategory === cat.value;
      return (
        <button
          key={cat.value}
          onClick={() => setSelectedCategory(isActive ? null : cat.value)}
          className={`flex flex-col items-center justify-center gap-1.5 shrink-0 w-[4.75rem] h-[4.75rem] rounded-[1.35rem] snap-start transition-all active:scale-95 ${
            isActive ? 'bg-[#6600FF] shadow-purple' : 'bg-white/70 border border-white/70'
          }`}
        >
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#171726]'}`} strokeWidth={1.8} />
          <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[#171726]'}`}>
            {t('events', `categories.${cat.value}`)}
          </span>
        </button>
      );
    })}
  </div>
</section>


      {selectedCategory && (
        <section className="mt-6 px-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Zap className="w-5 h-5 text-[#6600FF]" />{t('events', `categories.${selectedCategory}`)}</h2><button onClick={() => setSelectedCategory(null)} className="text-sm text-gray-400">Fermer</button></div>
          {categoryLoading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : categoryEvents.length === 0 ? (<EmptyState title="Aucun événement" description="Pas d'événement dans cette catégorie pour le moment" />) : (<div className="grid grid-cols-2 gap-4">{categoryEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}
        </section>
      )}

      {loading ? (
        <section className="mt-8 px-5" aria-label="Chargement des tendances">
          <div className="skeleton h-[26rem] rounded-[2rem]" />
        </section>
      ) : (
        <TrendingDeck events={trending} onEventClick={onEventClick} onBookEvent={onBookEvent || onEventClick} />
      )}

      {!loading && artists.length > 0 && (
  <section className="mt-8">
    <div className="px-5 flex items-end justify-between mb-4">
      <h2 className="text-[19px] font-bold text-[#1A1A2E] tracking-[-0.01em]">
        Artistes en vedette
      </h2>
      <button
        type="button"
        className="flex items-center gap-0.5 text-[14px] font-semibold text-[#6600FF] active:opacity-50 transition-opacity"
      >
        Tout voir
        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>

    <div className="relative">
      <div className="flex gap-5 overflow-x-auto no-scrollbar px-5 pb-2 snap-x snap-mandatory scroll-pl-5">
        {artists.map((artist) => (
          <button
            type="button"
            key={artist.id}
            onClick={() => onArtistClick?.(artist)}
            className="flex flex-col items-center gap-2.5 w-[5.75rem] shrink-0 snap-start active:scale-95 transition-transform duration-200 ease-out"
          >
            <div className="relative">
              <img
                src={artist.photo_url || `https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200`}
                alt={artist.name}
                loading="lazy"
                decoding="async"
                className="w-[5.5rem] h-[5.5rem] rounded-full object-cover ring-1 ring-black/5 shadow-[0_1px_3px_rgba(23,23,38,0.08)]"
              />
              {artist.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#6600FF] ring-[3px] ring-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.4 5.4a1 1 0 0 1 .2 1.4l-7 9a1 1 0 0 1-1.5.1l-4-4a1 1 0 1 1 1.4-1.4l3.2 3.2 6.3-8.1a1 1 0 0 1 1.4-.2z" />
                  </svg>
                </div>
              )}
                    </div>
                  <span className="text-[13px] font-semibold text-[#1A1A2E] text-center line-clamp-1 w-full leading-tight">
                    {artist.name}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {artist.followers_count > 1000
                      ? `${(artist.followers_count / 1000).toFixed(1)}K fans`
                      : `${artist.followers_count} fans`}
                  </span>
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-lavender to-transparent" />
          </div>
        </section>
      )}

      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Clock className="w-5 h-5 text-[#6600FF]" />À ne pas manquer</h2><button className="text-sm font-semibold text-[#6600FF]">Tout voir</button></div>
        {loading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : nearby.length === 0 ? (<EmptyState title="Aucun événement" description="Revenez bientôt pour de nouveaux événements" />) : (<div className="grid grid-cols-2 gap-4 animate-stagger">{nearby.slice(0, 6).map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}
      </section>

{!loading && platformStats && (
  <section className="mt-8 px-5">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp className="w-4 h-4 text-[#6600FF]" />
      <h3 className="text-[#171726] font-bold text-[17px] tracking-tight">Gbaigbance en chiffres</h3>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {/* Événements */}
      <div className="rounded-[1.6rem] p-4 bg-gradient-to-br from-[#EDE4FF] to-[#F7F3FF]">
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="w-4 h-4 text-[#6600FF]" strokeWidth={2} />
          <span className="text-[13px] font-bold text-[#171726]/70">Événements</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[26px] font-extrabold text-[#171726] leading-none">{platformStats.totalEvents}</p>
            <p className="text-[10px] text-[#171726]/40 font-semibold mt-1">au total</p>
          </div>
          <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
            <circle cx="17" cy="17" r="14" fill="none" stroke="#6600FF" strokeOpacity="0.12" strokeWidth="4" />
            <circle cx="17" cy="17" r="14" fill="none" stroke="#6600FF" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="26" transform="rotate(-90 17 17)" />
          </svg>
        </div>
      </div>

      {/* Artistes */}
      <div className="rounded-[1.6rem] p-4 bg-gradient-to-br from-[#FFF3D6] to-[#FFFBF0]">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-4 h-4 text-[#E8A93B]" strokeWidth={2} />
          <span className="text-[13px] font-bold text-[#171726]/70">Artistes</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[26px] font-extrabold text-[#171726] leading-none">{platformStats.totalArtists}</p>
            <p className="text-[10px] text-[#171726]/40 font-semibold mt-1">vérifiés</p>
          </div>
          <div className="flex items-end gap-[3px] h-[26px]">
            {[10, 18, 14, 24, 16].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full bg-[#E8A93B]" style={{ height: `${h}px`, opacity: i === 3 ? 1 : 0.35 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="rounded-[1.6rem] p-4 bg-gradient-to-br from-[#DCEEFF] to-[#F2F9FF]">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="w-4 h-4 text-[#2E90E8]" strokeWidth={2} />
          <span className="text-[13px] font-bold text-[#171726]/70">Participants</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[26px] font-extrabold text-[#171726] leading-none">{formatNumber(platformStats.totalParticipants)}</p>
            <p className="text-[10px] text-[#171726]/40 font-semibold mt-1">inscrits</p>
          </div>
          <svg width="40" height="26" viewBox="0 0 40 26" className="shrink-0">
            <path d="M0 18 Q6 6 12 14 T24 10 T40 4" fill="none" stroke="#2E90E8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Organisateurs */}
      <div className="rounded-[1.6rem] p-4 bg-gradient-to-br from-[#DFF3E6] to-[#F2FBF5]">
        <div className="flex items-center gap-1.5 mb-3">
          <Building2 className="w-4 h-4 text-[#38A166]" strokeWidth={2} />
          <span className="text-[13px] font-bold text-[#171726]/70">Organisateurs</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[26px] font-extrabold text-[#171726] leading-none">{platformStats.totalOrganizers}</p>
            <p className="text-[10px] text-[#171726]/40 font-semibold mt-1">actifs</p>
          </div>
          <div className="flex items-end gap-[3px] h-[26px]">
            {[14, 10, 20, 16, 24].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full bg-[#38A166]" style={{ height: `${h}px`, opacity: i === 4 ? 1 : 0.35 }} />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Billets vendus — pleine largeur */}
    <div className="rounded-[1.6rem] p-4 mt-3 bg-gradient-to-br from-[#FFE4D6] to-[#FFF4EE] flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TicketIcon className="w-4 h-4 text-[#E8683B]" strokeWidth={2} />
          <span className="text-[13px] font-bold text-[#171726]/70">Billets vendus</span>
        </div>
        <p className="text-[26px] font-extrabold text-[#171726] leading-none">{formatNumber(platformStats.totalTickets)}</p>
      </div>
      <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
        <circle cx="17" cy="17" r="14" fill="none" stroke="#E8683B" strokeOpacity="0.12" strokeWidth="4" />
        <circle cx="17" cy="17" r="14" fill="none" stroke="#E8683B" strokeWidth="4" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="18" transform="rotate(-90 17 17)" />
      </svg>
    </div>
  </section>
)}

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
