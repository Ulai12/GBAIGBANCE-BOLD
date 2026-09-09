import { useState, useEffect } from 'react';
import {
  Search, Users, MapPin,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Sparkles, ChevronRight,
  Settings,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { TrendingDeck } from '@/components/TrendingDeck';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { NotificationBell } from '@/components/NotificationBell';
import { LocationModal } from '@/components/LocationModal';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { GbaigbanceStatsDashboard } from '@/components/GbaigbanceStatsDashboard';
import { useApp } from '@/hooks/useApp';
import { COUNTRY_FLAGS, EVENT_CATEGORIES } from '@/constants';
import type { ToastData } from '@/components/Toast';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchPlatformStats,
} from '@/services/events';
import type { Event, Artist, EventCategory } from '@/types';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater, Landmark, Lock,
};

interface HomeScreenProps {
  onEventClick: (event: Event) => void;
  onSearchClick: () => void;
  onOpenNotifications: () => void;
  onProfileClick: () => void;
  onArtistClick?: (artist: Artist) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
  onBookEvent?: (event: Event) => void;
  onOpenAIAssistant?: () => void;
  onOpenAISettings?: () => void;
  onOpenSettings?: () => void;
}

export function HomeScreen({
  onEventClick,
  onSearchClick,
  onOpenNotifications,
  onProfileClick,
  onArtistClick,
  onBookEvent,
  onOpenAIAssistant,
  onOpenSettings,
}: HomeScreenProps) {
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
    const isValidDate = (dateStr?: string) => dateStr && !isNaN(new Date(dateStr).getTime());

    Promise.all([fetchFeaturedEvents(), fetchUpcomingEvents(), fetchTrendingEvents(), fetchFeaturedArtists()])
      .then(([feat, up, trend, art]) => {
        setFeatured(feat.filter((event) => event.status === 'published' && isValidDate(event.ends_at || event.starts_at) && new Date(event.ends_at || event.starts_at) > new Date()).slice(0, 5));
        setTrending(trend.filter((event) => event.status === 'published' && isValidDate(event.ends_at || event.starts_at) && new Date(event.ends_at || event.starts_at) > new Date()).slice(0, 5));
        setNearby(up.filter((event) => event.status === 'published' && isValidDate(event.ends_at || event.starts_at) && new Date(event.ends_at || event.starts_at) > new Date()));
        setArtists(art.slice(0, 6));
      })
      .catch(() => {}).finally(() => setLoading(false));
    fetchPlatformStats().then(setPlatformStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCategory) { setCategoryEvents([]); return; }
    setCategoryLoading(true);
    fetchEventsByCategory(selectedCategory).then(setCategoryEvents).catch(() => setCategoryEvents([])).finally(() => setCategoryLoading(false));
  }, [selectedCategory]);

  const heroEvent = featured[0] || trending[0];
  const safePrice = heroEvent?.price_min ?? 0;
  const safeAttendees = heroEvent?.attendees_count ?? 0;

  return (
    <div className="min-h-screen pb-32">
      {/* En-tête */}
      <div className="px-5 pt-9 pb-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 flex items-center justify-center text-base">
            🎟️
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-extrabold text-[#171726] tracking-tight">GBAIGBANCE</p>
            <p className="text-[9px] font-bold text-gray-400 tracking-[0.16em] uppercase mt-1">Billetterie & événements</p>
          </div>
        </div>

        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#171726] tracking-tight">
              {new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'} {user?.name?.split(' ')[0] || 'Invité'} 👋
            </h1>
            <p className="text-sm text-gray-400 ">Trouve ta prochaine sortie</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="home-ai-assistant-header-btn"
              type="button"
              onClick={onOpenAIAssistant}
              title="Assistant IA Gbaigbance (Gemini)"
              aria-label="Assistant IA"
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6600FF]/15 to-[#9333EA]/15 text-[#6600FF] hover:bg-[#6600FF]/25 flex items-center justify-center active:scale-90 transition-transform shadow-xs"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <PWAInstallButton variant="icon" />
            <NotificationBell onOpen={onOpenNotifications} />
            {onOpenSettings && (
              <button
                id="home-strategic-settings-btn"
                type="button"
                onClick={onOpenSettings}
                aria-label="Paramètres de l'application"
                title="Paramètres & Préférences"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#6600FF]/15 hover:text-[#6600FF] flex items-center justify-center active:scale-90 transition-all shadow-xs"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
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
              <span className="text-[11px] text-gray-500">Rechercher un événement, un artiste...</span>
            </div>
          </button>
          <button onClick={() => setLocationOpen(true)} className="w-[3.25rem] h-[3.25rem] shrink-0 rounded-2xl bg-white/90 shadow-md flex items-center justify-center active:scale-90 transition-transform text-lg" aria-label="Localisation">
            {COUNTRY_FLAGS[user?.country || 'TG'] || '🌍'}
          </button>
        </div>

        {/* AI Assistant Banner */}
        <div className="mt-3">
          <button
            id="home-ai-assistant-banner"
            type="button"
            onClick={onOpenAIAssistant}
            className="w-full py-2.5 px-4 rounded-3xl bg-gradient-to-r from-[#6600FF]/10 via-[#9333EA]/10 to-transparent border border-[#6600FF]/25 hover:border-[#6600FF]/50 transition-all flex items-center justify-between group active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] flex items-center justify-center text-white shadow-xs shadow-[#6600FF]/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#171726]">
                    Assistant Gbaigbance IA
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#6600FF] text-white text-[8px] font-bold">
                    Gemini
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate">
                  Recommandations, concerts & lieux avec Maps Grounding
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6600FF] group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>
      </div>

      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {!loading && heroEvent && (
        <section className="mt-4 px-5">
          <div onClick={() => onEventClick(heroEvent)} className="relative h-60 rounded-[2rem] overflow-hidden cursor-pointer group animate-slide-up shadow-[0_20px_45px_rgba(37,20,72,0.2)]">
            <img src={heroEvent.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={heroEvent.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/18 backdrop-blur-xl border border-white/25 shadow-lg"><Sparkles className="w-3.5 h-3.5 text-white" /><span className="text-xs font-bold text-white">À la une</span></div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-xl border border-white/15"><span className="w-2 h-2 bg-[#ff5b66] rounded-full animate-pulse" /><span className="text-xs font-bold text-white">Tendance</span></div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2 oui,"><span className="text-xs text-white/90 bg-white/15 backdrop-blur px-2.5 rounded-full font-medium">{t('events', `categories.${heroEvent.category}`)}</span><span className="flex items-center gap-1 text-xs text-white/80"><MapPin className="w-3 h-3" />{heroEvent.city}</span></div>
              <h2 className="text-white font-extrabold text-xl leading-tight line-clamp-2">{heroEvent.title}</h2>
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-extrabold text-white">{safePrice === 0 ? 'Gratuit' : `Dès ${safePrice.toLocaleString('fr-FR')} FCFA`}</span>
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{safeAttendees > 1000 ? `${(safeAttendees / 1000).toFixed(1)}K` : safeAttendees}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
          {featured.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1" aria-label="Autres événements à la une">
              {featured.slice(1).map((event) => (
                <button key={event.id} type="button" onClick={() => onEventClick(event)} className="flex min-w-[15rem] items-center gap-3 rounded-3xl border border-white/70 bg-white/60 p-2 text-left shadow-sm backdrop-blur transition-transform active:scale-[0.98]">
                  <img src={event.cover_url || event.images?.[0] || ''} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[#171726]">{event.title}</span><span className="mt-1 block text-xs text-gray-500">{new Date(event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {event.city}</span></span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-6 px-5">
        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d] mb-3">Explorer par catégorie</h2>
        <div className="grid grid-cols-4 gap-x-2.5 gap-y-3 py-1">
          {EVENT_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Music;
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                className={`flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[1.35rem] transition-all active:scale-95 ${
                  isActive ? 'bg-[#6600FF] shadow-purple' : 'bg-white/90 border border-black/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#6600FF]'}`} strokeWidth={1.8} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[#6600FF]'}`}>
                  {t('events', `categories.${cat.value}`)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCategory && (
        <section className="mt-6 px-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d]">
              {t('events', `categories.${selectedCategory}`)}
            </h2>
            <button onClick={() => setSelectedCategory(null)} className="text-sm text-gray-400">Fermer</button>
          </div>
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
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d]">
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
              {artists.map((artist) => {
                const followersCount = artist.followers_count ?? 0;
                return (
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
                      {followersCount > 1000
                        ? `${(followersCount / 1000).toFixed(1)}K fans`
                        : `${followersCount} fans`}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-lavender to-transparent" />
          </div>
        </section>
      )}

      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d]">À ne pas manquer</h2>
          <button
           type='button'
           className="flex items-center gap-0.5 text-[14px] font-semibold text-[#6600FF] active:opacity-50 transition-opacity"
          >
            Tout voir
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        {loading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : nearby.length === 0 ? (<EmptyState title="Aucun événement" description="Revenez bientôt pour de nouveaux événements" />) : (<div className="grid grid-cols-2 gap-4 animate-stagger">{nearby.slice(0, 6).map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}
      </section>

      {!loading && (
        <section className="mt-8 px-5">
         <div className="text-center mb-5">
            <h3 className="text-2xl font-black text-[#1A1A2E] tracking-[-0.01em]">GBAIGBANCE EN CHIFFRES</h3>
            <p className="text-[10px] font-extrabold text-[#6600FF]/60 tracking-[0.18em] uppercase mt-1">
              La billetterie qui grandit chaque jour
            </p>
          </div>
          <GbaigbanceStatsDashboard
            events={[...featured, ...trending, ...nearby]}
            platformStats={platformStats || undefined}
          />
        </section>
      )}

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}