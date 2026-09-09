import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Sparkles, ChevronRight,
  Settings, Gift, Navigation,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { TrendingDeck } from '@/components/TrendingDeck';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { NotificationBell } from '@/components/NotificationBell';
import { GbaigbanceStatsDashboard } from '@/components/GbaigbanceStatsDashboard';
import { useApp } from '@/hooks/useApp';
import { EVENT_CATEGORIES } from '@/constants';
import type { ToastData } from '@/components/Toast';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchPlatformStats,
  isEventTerminated, isEventActive,
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
    const isValidDate = (dateStr?: string) => Boolean(dateStr && !isNaN(new Date(dateStr).getTime()));

    Promise.all([fetchFeaturedEvents(), fetchUpcomingEvents(), fetchTrendingEvents(), fetchFeaturedArtists()])
      .then(([feat, up, trend, art]) => {
        // Strictly filter to active published events
        const filterValid = (list: Event[]) =>
          list.filter((event) => event.status === 'published' && isValidDate(event.starts_at) && !isEventTerminated(event));

        const validFeat = filterValid(feat);
        const validTrend = filterValid(trend);
        const validUp = filterValid(up);

        setFeatured(validFeat.length > 0 ? validFeat : feat.filter(e => e.status === 'published' && !isEventTerminated(e)));
        setTrending(validTrend.length > 0 ? validTrend : trend.filter(e => e.status === 'published' && !isEventTerminated(e)));
        setNearby(validUp.length > 0 ? validUp : up.filter(e => e.status === 'published' && !isEventTerminated(e)));
        setArtists(art.slice(0, 6));
      })
      .catch(() => {}).finally(() => setLoading(false));

    fetchPlatformStats().then(setPlatformStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCategory) { setCategoryEvents([]); return; }
    setCategoryLoading(true);
    fetchEventsByCategory(selectedCategory)
      .then((res) => setCategoryEvents(res.filter(e => e.status === 'published' && !isEventTerminated(e))))
      .catch(() => setCategoryEvents([]))
      .finally(() => setCategoryLoading(false));
  }, [selectedCategory]);

  const allActiveEvents = useMemo(() => {
    const map = new Map<string, Event>();
    [...featured, ...trending, ...nearby].forEach((e) => {
      if (e && e.id && isEventActive(e) && !isEventTerminated(e)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  }, [featured, trending, nearby]);

  // Conditional Section: Événements en cours / En direct
  const ongoingEvents = useMemo(() => {
    const now = Date.now();
    return allActiveEvents.filter((event) => {
      const start = new Date(event.starts_at).getTime();
      const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 6 * 3600 * 1000;
      return now >= start && now <= end;
    });
  }, [allActiveEvents]);

  // Conditional Section: Événements gratuits (Entrée libre)
  const freeEvents = useMemo(() => {
    return allActiveEvents.filter((event) => event.price_min === 0);
  }, [allActiveEvents]);

  // Conditional Section: À moins de 5 km (Lomé & proximité immédiate)
  const nearbyUnder5km = useMemo(() => {
    return allActiveEvents.filter((event) => {
      const loc = (event.location_name || '').toLowerCase();
      const city = (event.city || '').toLowerCase();
      return (
        city.includes('lomé') ||
        city.includes('lome') ||
        loc.includes('lomé') ||
        loc.includes('marina') ||
        loc.includes('stade') ||
        loc.includes('plage') ||
        loc.includes('centre') ||
        loc.includes('palais')
      );
    });
  }, [allActiveEvents]);

  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    if (hour >= 18 && hour < 23) return 'Bonsoir';
    return 'Douce nuit';
  };

  return (
    <div className="min-h-screen pb-32">
      {/* En-tête modernisée style iOS */}
      <header className="px-5 pt-7 pb-3">
        {/* Ligne Logo & Identité */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <img
            src="/icon.svg"
            alt="Gbaigbance"
            className="w-9 h-9 rounded-2xl shadow-xs object-contain ring-1 ring-black/5 dark:ring-white/10"
          />
          <div className="leading-tight">
            <p className="text-[15px] font-black text-[#171726] dark:text-white tracking-tight">GBAIGBANCE</p>
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 tracking-[0.16em] uppercase">Billetterie & Événements</p>
          </div>
        </div>

        {/* Dynamic greeting et boutons harmonisés */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171726] dark:text-white tracking-tight flex items-center gap-1.5">
              <span>{getDynamicGreeting()} {user?.name?.split(' ')[0] || 'Invité'}</span>
              <span className="text-xl">👋</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Trouve ta prochaine sortie</p>
          </div>

          {/* Boutons d'actions harmonisés (Notification, Paramètres, Profil) */}
          <div className="flex items-center gap-2">
            <NotificationBell onOpen={onOpenNotifications} />

            {onOpenSettings && (
              <button
                id="home-strategic-settings-btn"
                type="button"
                onClick={onOpenSettings}
                aria-label="Paramètres de l'application"
                title="Paramètres"
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center text-[#1A1A2E] dark:text-white hover:text-[#6600FF] active:scale-90 transition-all cursor-pointer"
              >
                <Settings className="w-5 h-5 transition-transform hover:rotate-45" />
              </button>
            )}

            <button
              onClick={onProfileClick}
              className="w-10 h-10 rounded-full ring-2 ring-[#6600FF]/25 overflow-hidden bg-white/90 dark:bg-white/10 shadow-xs active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Profil"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-[#6600FF]">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Recherche et bouton IA assistant */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSearchClick}
            className="flex-1 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-xs hover:border-[#6600FF]/30 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-xs sm:text-sm text-gray-400 font-medium">Concerts, soirées, festivals...</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAIAssistant}
            className="w-12 h-12 shrink-0 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md shadow-xs border border-black/5 dark:border-white/10 flex items-center justify-center text-[#6600FF] hover:bg-white dark:hover:bg-white/15 active:scale-90 transition-all relative group cursor-pointer"
            aria-label="Assistant IA Gbaigbance"
            title="Assistant IA Gbaigbance"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#6600FF] transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#1A1829] animate-pulse" />
            </div>
          </button>
        </div>
      </header>

      {/* SECTION 1: Événements à la une avec carrousel auto-défilant fluide */}
      <section className="mt-3 px-5" aria-label="Événements à la une">
        {loading ? (
          <div className="skeleton aspect-[16/10] sm:aspect-[21/10] w-full rounded-[2rem]" />
        ) : featured.length > 0 ? (
          <FeaturedCarousel
            events={featured}
            onEventClick={onEventClick}
            onBookEvent={onBookEvent || onEventClick}
          />
        ) : null}
      </section>

      {/* SECTION CONDITIONNELLE 1: Événements en cours / En direct */}
      {!loading && ongoingEvents.length > 0 && (
        <section className="mt-7 px-5 animate-slide-up" aria-label="Événements en cours">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  En ce moment
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Événements actuellement en direct
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">
              LIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {ongoingEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION CATÉGORIES */}
      <section className="mt-7 px-5">
        <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white mb-3">
          Explorer par catégorie
        </h2>
        <div className="grid grid-cols-4 gap-2.5 py-1">
          {EVENT_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Music;
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                className={`flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[1.35rem] transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-[#6600FF] shadow-purple text-white'
                    : 'bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 text-[#6600FF] dark:text-purple-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#6600FF] dark:text-purple-300'}`} strokeWidth={1.8} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[#171726] dark:text-white'}`}>
                  {t('events', `categories.${cat.value}`)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* RÉSULTATS CATÉGORIE SÉLECTIONNÉE */}
      {selectedCategory && (
        <section className="mt-6 px-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
              {t('events', `categories.${selectedCategory}`)}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-bold text-[#6600FF] bg-[#6600FF]/10 px-3 py-1.5 rounded-full cursor-pointer"
            >
              Fermer
            </button>
          </div>
          {categoryLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : categoryEvents.length === 0 ? (
            <EmptyState title="Aucun événement" description="Pas d'événement dans cette catégorie pour le moment" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {categoryEvents.map((event) => (
                <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION TENDANCES (Deck interactif) */}
      {loading ? (
        <section className="mt-8 px-5" aria-label="Chargement des tendances">
          <div className="skeleton h-[26rem] rounded-[2rem]" />
        </section>
      ) : trending.length > 0 ? (
        <TrendingDeck events={trending} onEventClick={onEventClick} onBookEvent={onBookEvent || onEventClick} />
      ) : null}

      {/* SECTION CONDITIONNELLE 2: Événements 100% Gratuits */}
      {!loading && freeEvents.length > 0 && (
        <section className="mt-8 px-5" aria-label="Événements gratuits">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  Événements Gratuits
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Entrée 100% libre sans frais
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              0 FCFA
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {freeEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION CONDITIONNELLE 3: À moins de 5 km */}
      {!loading && nearbyUnder5km.length > 0 && (
        <section className="mt-8 px-5" aria-label="À moins de 5 km">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  À moins de 5 km
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Lomé et proximité immédiate
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold">
              Proche
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {nearbyUnder5km.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION ARTISTES */}
      {!loading && artists.length > 0 && (
        <section className="mt-8">
          <div className="px-5 flex items-end justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
              Artistes en vedette
            </h2>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[13px] font-bold text-[#6600FF] active:opacity-60 transition-opacity"
            >
              Tout voir
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2 snap-x snap-mandatory scroll-pl-5">
              {artists.map((artist) => {
                const followersCount = artist.followers_count ?? 0;
                return (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => onArtistClick?.(artist)}
                    className="flex flex-col items-center gap-2.5 w-[5.75rem] shrink-0 snap-start active:scale-95 transition-transform duration-200 ease-out cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={artist.photo_url || `https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=200`}
                        alt={artist.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-[5.25rem] h-[5.25rem] rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10 shadow-sm"
                      />
                      {artist.is_verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#6600FF] ring-2 ring-white flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M16.4 5.4a1 1 0 0 1 .2 1.4l-7 9a1 1 0 0 1-1.5.1l-4-4a1 1 0 1 1 1.4-1.4l3.2 3.2 6.3-8.1a1 1 0 0 1 1.4-.2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-[#1A1A2E] dark:text-white text-center line-clamp-1 w-full leading-tight">
                      {artist.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {followersCount > 1000
                        ? `${(followersCount / 1000).toFixed(1)}K fans`
                        : `${followersCount} fans`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION À NE PAS MANQUER */}
      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
            À ne pas manquer
          </h2>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[13px] font-bold text-[#6600FF] active:opacity-60 transition-opacity"
          >
            Tout voir
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : nearby.length === 0 ? (
          <EmptyState title="Aucun événement" description="Revenez bientôt pour de nouveaux événements" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {nearby.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        )}
      </section>

      {/* STATS GLOBALES GBAIGBANCE */}
      {!loading && (
        <section className="mt-9 px-5">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
              Gbaigbance en chiffres
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Statistiques globales de la plateforme · Données en direct
            </p>
          </div>
          <GbaigbanceStatsDashboard
            events={allActiveEvents}
            platformStats={platformStats || undefined}
          />
        </section>
      )}
    </div>
  );
}
