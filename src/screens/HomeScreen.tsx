import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Sparkles, ChevronRight,
  Settings, Gift, Navigation, Flame, Building2,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { NearbyEventTile } from '@/components/NearbyEventTile';
import { TrendingDeck } from '@/components/TrendingDeck';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import {
  EventCardSkeleton,
  FeaturedCarouselSkeleton,
  TrendingDeckSkeleton,
  NearbyTileSkeleton,
} from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { NotificationBell } from '@/components/NotificationBell';
import { GbaigbanceStatsDashboard } from '@/components/GbaigbanceStatsDashboard';
import { SeeMoreModal, type SeeMoreSectionType } from '@/components/SeeMoreModal';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/hooks/useApp';
import { EVENT_CATEGORIES } from '@/constants';
import type { ToastData } from '@/components/Toast';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchVerifiedOrganizations,
  fetchPlatformStats, isEventTerminated, isEventActive,
  type PlatformStats,
} from '@/services/events';
import { getCachedHomeData, saveCachedHomeData, hydrateHomeFromIndexedDB } from '@/services/cache';
import {
  calculateDistanceKm,
  getCurrentUserLocation,
  requestUserLocation,
  getEventCoordinates,
  LOME_CENTER,
  type UserLocationState,
} from '@/utils/geo';
import type { Event, Artist, Organization, EventCategory } from '@/types';
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
  onOrganizationClick?: (organization: Organization) => void;
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
  onOrganizationClick,
  onBookEvent,
  onOpenAIAssistant,
  onOpenSettings,
  onToast,
}: HomeScreenProps) {
  const { user, t } = useApp();

  // Instant 0ms cache loading: read synchronously from memory or storage
  const initialCache = getCachedHomeData();
  const [featured, setFeatured] = useState<Event[]>(initialCache.data?.featured || []);
  const [trending, setTrending] = useState<Event[]>(initialCache.data?.trending || []);
  const [nearby, setNearby] = useState<Event[]>(initialCache.data?.nearby || []);
  const [artists, setArtists] = useState<Artist[]>(initialCache.data?.artists || []);
  const [organizations, setOrganizations] = useState<Organization[]>(initialCache.data?.organizations || []);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(initialCache.data?.stats || null);
  const [loading, setLoading] = useState(!initialCache.hasCache);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onToastRef.current = onToast;
  });

  // User location for spatial distance calculation
  const [userLocation, setUserLocation] = useState<UserLocationState>({
    latitude: LOME_CENTER.latitude,
    longitude: LOME_CENTER.longitude,
    isActual: false,
    status: 'idle',
    cityName: 'Lomé',
  });
  const [requestingGps, setRequestingGps] = useState(false);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [categoryEvents, setCategoryEvents] = useState<Event[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Dedicated "Voir plus" modal state
  const [seeMoreType, setSeeMoreType] = useState<SeeMoreSectionType | null>(null);

  // Geolocation request with automatic Lomé fallback
  useEffect(() => {
    getCurrentUserLocation().then((loc) => {
      setUserLocation(loc);
    });
  }, []);

  const handleRequestGPS = async () => {
    setRequestingGps(true);
    try {
      const loc = await requestUserLocation();
      setUserLocation(loc);
    } finally {
      setRequestingGps(false);
    }
  };

  // IndexedDB background fallback if localStorage was cleared
  useEffect(() => {
    if (!initialCache.hasCache) {
      hydrateHomeFromIndexedDB().then((cached) => {
        if (cached && (cached.featured.length > 0 || cached.nearby.length > 0)) {
          setFeatured(cached.featured);
          setTrending(cached.trending);
          setNearby(cached.nearby);
          setArtists(cached.artists);
          setOrganizations(cached.organizations);
          setPlatformStats(cached.stats);
          setLoading(false);
        }
      });
    }
  }, [initialCache.hasCache]);

  // Background silent fetch to hydrate & refresh data without UI flashing
  useEffect(() => {
    const isValidDate = (dateStr?: string) => Boolean(dateStr && !isNaN(new Date(dateStr).getTime()));

    Promise.all([
      fetchFeaturedEvents(),
      fetchUpcomingEvents(),
      fetchTrendingEvents(),
      fetchFeaturedArtists(),
      fetchVerifiedOrganizations(),
      fetchPlatformStats(),
    ])
      .then(([feat, up, trend, art, orgs, stats]) => {
        const filterValid = (list: Event[]) =>
          list.filter((event) => event.status === 'published' && isValidDate(event.starts_at) && !isEventTerminated(event));

        const validFeat = filterValid(feat);
        const validTrend = filterValid(trend);
        const validUp = filterValid(up);

        const newFeat = validFeat.length > 0 ? validFeat : feat.filter((e) => e.status === 'published' && !isEventTerminated(e));
        const newTrend = validTrend.length > 0 ? validTrend : trend.filter((e) => e.status === 'published' && !isEventTerminated(e));
        const newNearby = validUp.length > 0 ? validUp : up.filter((e) => e.status === 'published' && !isEventTerminated(e));

        setFeatured(newFeat);
        setTrending(newTrend);
        setNearby(newNearby);
        setArtists(art);
        setOrganizations(orgs);
        setPlatformStats(stats);

        // Save fresh data into the 0ms synchronous cache
        saveCachedHomeData({
          featured: newFeat,
          trending: newTrend,
          nearby: newNearby,
          artists: art,
          organizations: orgs,
          stats,
        });
      })
      .catch(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          onToastRef.current({
            message: 'Mode hors-ligne : données sauvegardées affichées',
            type: 'info',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Category events fetch
  useEffect(() => {
    if (!selectedCategory) {
      setCategoryEvents([]);
      return;
    }
    setCategoryLoading(true);
    fetchEventsByCategory(selectedCategory)
      .then((res) => setCategoryEvents(res.filter((e) => e.status === 'published' && !isEventTerminated(e))))
      .catch(() => setCategoryEvents([]))
      .finally(() => setCategoryLoading(false));
  }, [selectedCategory]);

  // Unified list of all unique active published events
  const allActiveEvents = useMemo(() => {
    const map = new Map<string, Event>();
    [...featured, ...trending, ...nearby].forEach((e) => {
      if (e && e.id && isEventActive(e) && !isEventTerminated(e)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  }, [featured, trending, nearby]);

  // Spatial enrichment: compute exact distance from user ONLY when GPS is real/actual!
  const allEventsWithDistance = useMemo(() => {
    return allActiveEvents.map((event) => {
      if (!userLocation.isActual) {
        return { ...event, distanceKm: undefined };
      }
      const coords = getEventCoordinates(event);
      const distanceKm = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        coords.latitude,
        coords.longitude
      );
      return { ...event, distanceKm };
    });
  }, [allActiveEvents, userLocation]);

  // Section: Proximité / Sorties locales adaptées (GPS réel vs sélection Lomé)
  const nearbySectionData = useMemo(() => {
    if (userLocation.isActual) {
      const sorted = [...allEventsWithDistance]
        .filter((e) => typeof e.distanceKm === 'number')
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      const strictlyUnder10 = sorted.filter((e) => typeof e.distanceKm === 'number' && e.distanceKm <= 10.0);
      if (strictlyUnder10.length > 0) {
        const maxDist = Math.max(...strictlyUnder10.map((e) => e.distanceKm || 0));
        return {
          title: maxDist <= 5.0 ? 'À moins de 5 km' : 'À proximité de vous',
          subtitle: 'Autour de votre position GPS réelle',
          events: strictlyUnder10,
          isActual: true,
        };
      }
      // User is far from Lomé (e.g. abroad or outside city)
      return {
        title: 'Sorties populaires à Lomé',
        subtitle: 'Position GPS hors Lomé · Sélection Togo',
        events: allActiveEvents.slice(0, 6),
        isActual: false,
      };
    }

    // Default when GPS is not enabled / denied
    return {
      title: 'Sorties populaires à Lomé',
      subtitle: 'Lieu : Lomé · Activez le GPS pour vos sorties proches',
      events: allActiveEvents.slice(0, 6),
      isActual: false,
    };
  }, [allActiveEvents, allEventsWithDistance, userLocation]);

  // Section: Selon vos préférences (matches user profile preferred categories or vibrant defaults)
  const userPreferencesEvents = useMemo(() => {
    const userPrefs = (user?.preferred_genres || []).map((g) => g.toLowerCase());
    const targetCategories = userPrefs.length > 0 ? userPrefs : ['concert', 'party', 'festival', 'culture', 'spectacle'];

    const matches = allEventsWithDistance.filter((event) => {
      const cat = (event.category || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      return targetCategories.some((pref) => cat.includes(pref) || title.includes(pref));
    });

    return matches.length > 0 ? matches : allEventsWithDistance;
  }, [allEventsWithDistance, user]);

  // Section: Événements 100% Gratuits
  const freeEvents = useMemo(() => {
    return allEventsWithDistance.filter((event) => event.price_min === 0);
  }, [allEventsWithDistance]);

  // Section: À ne pas manquer (High engagement upcoming active events)
  const unmissableEvents = useMemo(() => {
    return [...allEventsWithDistance]
      .sort((a, b) => (b.attendees_count || 0) + (b.views_count || 0) - ((a.attendees_count || 0) + (a.views_count || 0)));
  }, [allEventsWithDistance]);

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
              className="w-10 h-10 rounded-full ring-2 ring-[#6600FF]/25 overflow-hidden shadow-xs active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Profil"
            >
              <UserAvatar
                src={user?.avatar_url}
                name={user?.name || 'Invité'}
                role={user?.role || 'attendee'}
                size="sm"
                className="w-full h-full"
              />
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

      {/* SECTION 1: Événements à la une */}
      <section className="mt-3 px-5" aria-label="Événements à la une">
        {loading && featured.length === 0 ? (
          <FeaturedCarouselSkeleton />
        ) : featured.length > 0 ? (
          <FeaturedCarousel
            events={featured}
            onEventClick={onEventClick}
            onBookEvent={onBookEvent || onEventClick}
          />
        ) : null}
      </section>

      {/* SECTION 2: Explorer par catégorie */}
      <section className="mt-8 px-5">
        <div className="text-center">
        <h2 className="text-xl uppercase items-center sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white mb-3">
          Explorer par catégorie
        </h2>
        </div>
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

      {/* SECTION 3: Tendances de la semaine (placé sous la section catégorie) */}
      {loading && trending.length === 0 ? (
        <section className="mt-8 px-5" aria-label="Tendances de la semaine">
          <TrendingDeckSkeleton />
        </section>
      ) : trending.length > 0 ? (
        <section className="mt-8 px-5" aria-label="Tendances de la semaine">
          <TrendingDeck events={trending} onEventClick={onEventClick} onBookEvent={onBookEvent || onEventClick} />
        </section>
      ) : null}

      {/* SECTION 4: Proximité / Sorties locales (Tuiles défilables horizontales compactes) */}
      {loading && nearbySectionData.events.length === 0 ? (
        <section className="mt-8 px-5" aria-label="Événements à proximité">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  À proximité de vous
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0 whiterap">
                  Recherche des événements locaux...
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1.5 -mx-5 px-5">
            <NearbyTileSkeleton />
            <NearbyTileSkeleton />
            <NearbyTileSkeleton />
          </div>
        </section>
      ) : nearbySectionData.events.length > 0 ? (
        <section className="mt-8 px-5" aria-label={nearbySectionData.title}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Navigation className={`w-4 h-4 ${requestingGps ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white truncate">
                  {nearbySectionData.title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                  {nearbySectionData.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!userLocation.isActual && (
                <button
                  type="button"
                  onClick={handleRequestGPS}
                  disabled={requestingGps}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-500/20 px-2.5 py-1.5 rounded-full cursor-pointer transition-all active:scale-95"
                  title="Activer le GPS"
                >
                  <Navigation className={`w-3 h-3 ${requestingGps ? 'animate-spin' : ''}`} />
                  <span>{requestingGps ? 'GPS...' : 'Activer GPS'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSeeMoreType('nearby')}
                className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
              >
                <span>Voir plus</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Tuiles défilables horizontales modernes compactes */}
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1.5 -mx-[10px]">
            {nearbySectionData.events.map((event) => (
              <NearbyEventTile
                key={event.id}
                event={event}
                isActualLocation={nearbySectionData.isActual}
                onClick={() => onEventClick(event)}
                onBook={onBookEvent ? () => onBookEvent(event) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* SECTION 5: Selon vos préférences */}
      {userPreferencesEvents.length > 0 && (
        <section className="mt-9 px-5" aria-label="Selon vos préférences">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  Selon vos préférences
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Sélection personnalisée selon vos goûts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('preferences')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {userPreferencesEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: Événements 100% Gratuits */}
      {freeEvents.length > 0 && (
        <section className="mt-9 px-5" aria-label="Événements gratuits">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
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

            <button
              type="button"
              onClick={() => setSeeMoreType('free')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {freeEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 7: À ne pas manquer */}
      {unmissableEvents.length > 0 && (
        <section className="mt-9 px-5" aria-label="À ne pas manquer">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  À ne pas manquer
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Les événements les plus attendus
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('unmissable')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {unmissableEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 8: Artistes du moment (vrais comptes artistes) */}
      {artists.length > 0 && (
        <section className="mt-9" aria-label="Artistes du moment">
          <div className="px-5 flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  Artistes du moment
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Talents et créateurs de la communauté
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('artists')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory scroll-pl-5">
              {artists.map((artist) => {
                const followersCount = artist.followers_count ?? 0;
                return (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => onArtistClick?.(artist)}
                    className="flex flex-col items-center gap-1.5 w-[4rem] shrink-0 snap-start active:scale-95 transition-transform duration-200 
                    ease-out cursor-pointer text-center w-full whitespace-nowrap"
                  >
                    <UserAvatar
                      src={artist.photo_url}
                      name={artist.name}
                      role="artist"
                      size="md"
                      shape="circle"
                      isVerified={artist.is_verified}
                    />
                    <span className="text-[12px] font-bold text-[#1A1A2E] dark:text-white text-center line-clamp-1 w-full leading-tight">
                      {artist.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {followersCount > 1000
                        ? `${(followersCount / 1000).toFixed(1)}K fans`
                        : `${followersCount} fan${followersCount > 1 ? 's' : ''}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 9: Organisateurs officiels (vrais comptes organisateurs) */}
      {organizations.length > 0 && (
        <section className="mt-6" aria-label="Organisateurs officiels">
          <div className="px-5 flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  Organisateurs officiels
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Collectifs et créateurs d’expériences
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('organizations')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-4 items-center overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory scroll-pl-5">
              {organizations.map((org) => {
                return (
                  <button
                    type="button"
                    key={org.id}
                    onClick={() => onOrganizationClick?.(org)}
                    className="flex flex-col gap-1.5 w-[4rem] shrink-0 snap-start active:scale-95 transition-transform duration-200 
                    ease-out cursor-pointer text-center w-full whitespace-nowrap"
                  >
                    <UserAvatar
                      src={org.logo_url}
                      name={org.name}
                      role="organizer"
                      size="xl"
                      shape="squircle"
                      isVerified={org.verification_status === 'verified'}
                    />
                    <span className="text-[12px] font-bold text-[#1A1A2E] dark:text-white text-center line-clamp-1 w-full leading-tight">
                      {org.name}
                    </span>

                    <span className="text-[10px] text-gray-400 font-bold">
                      {org.events_count ?? 0} événement{(org.events_count ?? 0) > 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* STATS GLOBALES GBAIGBANCE (Titre et sous-titre intacts comme demandé) */}
      <section className="mt-9 px-5">
         <div className="text-center mb-5">
            <h3 className="text-2xl font-black text-[#1A1A2E] dark:text-white tracking-[-0.01em]">
              GBAIGBANCE EN CHIFFRES</h3>
            <p className="text-[10px] font-extrabold text-[#6600FF]/80 dark:text-gray-400 tracking-[0.18em] uppercase mt-1">
              Statistiques globales de la plateforme · En Direct
            </p>
          </div>
        <GbaigbanceStatsDashboard
          events={allActiveEvents}
          platformStats={platformStats || undefined}
        />
      </section>

      {/* DEDICATED SEE MORE FULL SCREEN VIEW / MODAL */}
      <SeeMoreModal
        type={seeMoreType}
        onClose={() => setSeeMoreType(null)}
        events={allEventsWithDistance}
        artists={artists}
        organizations={organizations}
        onEventClick={onEventClick}
        onArtistClick={onArtistClick}
        onOrganizationClick={onOrganizationClick}
      />
    </div>
  );
}
