import { useState, useEffect, useRef } from 'react';
import {
  Search, Star, TrendingUp, Clock, Users, Heart, MapPin,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Flame, Sparkles, Calendar, ChevronRight, Zap, Building2, Ticket as TicketIcon,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
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
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function HomeScreen({ onEventClick, onSearchClick, onOpenNotifications, onProfileClick }: HomeScreenProps) {
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchFeaturedEvents(), fetchUpcomingEvents(), fetchTrendingEvents(), fetchFeaturedArtists()])
      .then(([feat, up, trend, art]) => { setFeatured(feat.slice(0, 5)); setTrending(trend.slice(0, 5)); setNearby(up); setArtists(art.slice(0, 6)); })
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
    <div className="min-h-screen pb-32 bg-lavender">
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-sm text-gray-500 font-medium">{new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'}, {user?.name?.split(' ')[0] || 'Invité'}!</p><h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">GBAIGBANCE</h1></div>
          <div className="flex items-center gap-2.5">
            <NotificationBell onOpen={onOpenNotifications} />
            <button onClick={() => setLocationOpen(true)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-lg active:scale-90 transition-transform" aria-label="Localisation">{COUNTRY_FLAGS[user?.country || 'TG'] || '🌍'}</button>
            <button onClick={onProfileClick} className="w-10 h-10 rounded-full ring-2 ring-[#6600FF]/20 overflow-hidden bg-[#6600FF]/10 shadow-md active:scale-90 transition-transform" aria-label="Profil">{user?.avatar_url ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-sm font-extrabold text-[#6600FF]">{user?.name?.charAt(0).toUpperCase() || '?'}</span>}</button>
          </div>
        </div>
        <button onClick={onSearchClick} className="w-full"><div className="search-bar flex items-center gap-3 px-5 py-3.5 text-left hover:shadow-md transition-shadow"><Search className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-400">Rechercher un événement, un artiste...</span></div></button>
      </div>

      {!loading && heroEvent && (
        <section className="mt-4 px-5">
          <div onClick={() => onEventClick(heroEvent)} className="relative h-56 rounded-3xl overflow-hidden cursor-pointer group animate-slide-up">
            <img src={heroEvent.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={heroEvent.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#6600FF] to-[#8B5CF6] shadow-lg"><Sparkles className="w-3.5 h-3.5 text-white" /><span className="text-xs font-bold text-white">À la une</span></div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur"><span className="w-2 h-2 bg-white rounded-full animate-pulse" /><span className="text-xs font-bold text-white">Tendance</span></div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2"><span className="text-xs text-white/90 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full font-medium">{t('events', `categories.${heroEvent.category}`)}</span><span className="flex items-center gap-1 text-xs text-white/80"><MapPin className="w-3 h-3" />{heroEvent.city}</span></div>
              <h2 className="text-white font-extrabold text-xl leading-tight line-clamp-2">{heroEvent.title}</h2>
              <div className="flex items-center justify-between mt-3"><span className="text-lg font-extrabold text-white">{heroEvent.price_min === 0 ? 'Gratuit' : `Dès ${heroEvent.price_min.toLocaleString('fr-FR')} FCFA`}</span><div className="flex items-center gap-1.5 text-white/80 text-sm"><Users className="w-4 h-4" /><span>{heroEvent.attendees_count > 1000 ? `${(heroEvent.attendees_count / 1000).toFixed(1)}K` : heroEvent.attendees_count}</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div></div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 px-5">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-3">Explorer par catégorie</h2>
        <div className="grid grid-cols-4 gap-3 animate-stagger">
          {EVENT_CATEGORIES.map((cat) => { const Icon = CATEGORY_ICONS[cat.icon] || Music; const isActive = selectedCategory === cat.value; return (<button key={cat.value} onClick={() => setSelectedCategory(isActive ? null : cat.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${isActive ? 'bg-[#6600FF] shadow-purple scale-105' : 'bg-white hover:shadow-card-hover'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${cat.color}`}><Icon className="w-5 h-5 text-white" /></div><span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-[#1A1A2E]'}`}>{t('events', `categories.${cat.value}`)}</span></button>); })}
        </div>
      </section>

      {selectedCategory && (
        <section className="mt-6 px-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Zap className="w-5 h-5 text-[#6600FF]" />{t('events', `categories.${selectedCategory}`)}</h2><button onClick={() => setSelectedCategory(null)} className="text-sm text-gray-400">Fermer</button></div>
          {categoryLoading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : categoryEvents.length === 0 ? (<EmptyState title="Aucun événement" description="Pas d'événement dans cette catégorie pour le moment" />) : (<div className="grid grid-cols-2 gap-4">{categoryEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}
        </section>
      )}

      <section className="mt-8">
        <div className="px-5 flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Flame className="w-5 h-5 text-orange-500" />Tendances cette semaine</h2><button className="text-sm font-semibold text-[#6600FF]">Tout voir</button></div>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2 snap-x snap-mandatory">
          {loading ? Array.from({ length: 3 }).map((_, i) => (<div key={i} className="w-72 shrink-0 snap-start"><div className="skeleton h-44 rounded-3xl mb-2" /><div className="skeleton h-4 w-3/4 mb-1.5" /><div className="skeleton h-3 w-1/2" /></div>)) : trending.map((event, idx) => (
            <div key={event.id} onClick={() => onEventClick(event)} className="w-72 shrink-0 snap-start cursor-pointer group animate-slide-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="card-dark relative h-44">
                <img src={event.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-br from-[#6600FF] to-[#8B5CF6] flex items-center justify-center shadow-lg"><span className="text-xs font-extrabold text-white">{idx + 1}</span></div>
                <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform"><Heart className="w-4 h-4 text-[#6600FF]" /></button>
                <div className="absolute bottom-3 left-3 right-3"><h3 className="text-white font-bold text-base leading-tight line-clamp-1">{event.title}</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-white/80 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">{t('events', `categories.${event.category}`)}</span><span className="text-xs text-white/80 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{event.city}</span></div></div>
              </div>
              <div className="flex items-center justify-between mt-2 px-1"><span className="text-sm font-bold text-[#6600FF]">{event.price_min === 0 ? 'Gratuit' : `Dès ${event.price_min.toLocaleString('fr-FR')} FCFA`}</span><span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{event.attendees_count > 1000 ? `${(event.attendees_count / 1000).toFixed(1)}K` : event.attendees_count}</span></div>
            </div>
          ))}
        </div>
      </section>

      {!loading && artists.length > 0 && (
        <section className="mt-8">
          <div className="px-5 flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Star className="w-5 h-5 text-yellow-400" />Artistes en vedette</h2><button className="text-sm font-semibold text-[#6600FF]">Tout voir</button></div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
            {artists.map((artist) => (
              <div key={artist.id} className="flex flex-col items-center gap-2 w-24 shrink-0 cursor-pointer group">
                <div className="relative"><img src={artist.photo_url || `https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200`} alt={artist.name} className="w-20 h-20 rounded-full object-cover ring-2 ring-[#6600FF]/30 group-hover:ring-[#6600FF] transition-all" />{artist.is_verified && <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5"><svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M16.4 5.4a1 1 0 0 1 .2 1.4l-7 9a1 1 0 0 1-1.5.1l-4-4a1 1 0 1 1 1.4-1.4l3.2 3.2 6.3-8.1a1 1 0 0 1 1.4-.2z"/></svg></div>}</div>
                <span className="text-xs font-semibold text-[#1A1A2E] text-center line-clamp-1 w-full">{artist.name}</span>
                <span className="text-[10px] text-gray-500">{artist.followers_count > 1000 ? `${(artist.followers_count / 1000).toFixed(1)}K` : artist.followers_count} fans</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3"><h2 className="flex items-center gap-1.5 text-lg font-bold text-[#1A1A2E]"><Clock className="w-5 h-5 text-[#6600FF]" />À ne pas manquer</h2><button className="text-sm font-semibold text-[#6600FF]">Tout voir</button></div>
        {loading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : nearby.length === 0 ? (<EmptyState title="Aucun événement" description="Revenez bientôt pour de nouveaux événements" />) : (<div className="grid grid-cols-2 gap-4 animate-stagger">{nearby.slice(0, 6).map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}
      </section>

      {!loading && platformStats && (
        <section className="mt-8 px-5">
          <div className="card-dark p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#6600FF]/20 rounded-full blur-2xl" /><div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#8B5CF6]/20 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-[#8B5CF6]" /><h3 className="text-white font-bold text-base">Gbaigbance en chiffres</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/20 flex items-center justify-center"><Calendar className="w-5 h-5 text-[#8B5CF6]" /></div><div><p className="text-2xl font-extrabold text-white animate-pop">{platformStats.totalEvents}</p><p className="text-xs text-white/60">Événements</p></div></div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5"><div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-400" /></div><div><p className="text-2xl font-extrabold text-white animate-pop">{platformStats.totalArtists}</p><p className="text-xs text-white/60">Artistes</p></div></div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5"><div className="w-10 h-10 rounded-xl bg-green-400/20 flex items-center justify-center"><Users className="w-5 h-5 text-green-400" /></div><div><p className="text-2xl font-extrabold text-white animate-pop">{formatNumber(platformStats.totalParticipants)}</p><p className="text-xs text-white/60">Participants</p></div></div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5"><div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-400" /></div><div><p className="text-2xl font-extrabold text-white animate-pop">{platformStats.totalOrganizers}</p><p className="text-xs text-white/60">Organisateurs</p></div></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mt-3"><div className="w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center"><TicketIcon className="w-5 h-5 text-orange-400" /></div><div><p className="text-2xl font-extrabold text-white animate-pop">{platformStats.totalTickets}</p><p className="text-xs text-white/60">Billets vendus</p></div></div>
            </div>
          </div>
        </section>
      )}
      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}
