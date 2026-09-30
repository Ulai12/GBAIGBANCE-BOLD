import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
} from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { NotificationBell } from '@/components/NotificationBell';
import { GbaigbanceStatsDashboard } from '@/components/GbaigbanceStatsDashboard';
import { SeeMoreModal, type SeeMoreSectionType } from '@/components/SeeMoreModal';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { EVENT_CATEGORIES, eventMatchesCategoryFilter } from '@/constants';
import type { ToastData } from '@/components/Toast';
import { haptic } from '@/hooks/useHaptics';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchVerifiedOrganizations,
  fetchPlatformStats, isEventTerminated, isEventActive, isRealEvent,
  subscribeToGlobalEventsLive, subscribeToPlatformStatsLive,
  type PlatformStats,
} from '@/services/events';
import { getCachedHomeData, saveCachedHomeData, hydrateHomeFromIndexedDB } from '@/services/cache';
import {
  calculateDistanceKm,
  getCurrentUserLocation,
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
  const { likedEventIds, followedArtistIds, followedOrgIds } = useFavorites();

  // Instant 0ms cache loading: read synchronously from memory or storage (exclure immédiatement tout événement terminé à la une)
  const initialCache = getCachedHomeData();
  const [featured, setFeatured] = useState<Event[]>(() =>
    (initialCache.data?.featured || []).filter((e) => !isEventTerminated(e))
  );
  const [trending, setTrending] = useState<Event[]>(initialCache.data?.trending || []);
  const [nearby, setNearby] = useState<Event[]>(initialCache.data?.nearby || []);
  const [artists, setArtists] = useState<Artist[]>(initialCache.data?.artists || []);
  const [organizations, setOrganizations] = useState<Organization[]>(initialCache.data?.organizations || []);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(initialCache.data?.stats || null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
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

  // IndexedDB background fallback if localStorage was cleared
  useEffect(() => {
    if (!initialCache.hasCache) {
      hydrateHomeFromIndexedDB().then((cached) => {
        if (cached && (cached.featured.length > 0 || cached.nearby.length > 0)) {
          setFeatured((cached.featured || []).filter((e) => !isEventTerminated(e)));
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

  // Stable background and foreground data refresher
  const refreshHomeData = useCallback(async (silent = true) => {
    if (!silent && !initialCache.hasCache) {
      setLoading(true);
    }

    try {
      const [feat, up, trend, art, orgs, stats] = await Promise.all([
        fetchFeaturedEvents(),
        fetchUpcomingEvents(),
        fetchTrendingEvents(),
        fetchFeaturedArtists(),
        fetchVerifiedOrganizations(),
        fetchPlatformStats(),
      ]);

      // Algorithme de score de tendance basé sur l'engagement réel et la proximité temporelle
      const calculateTrendingScore = (e: Event): number => {
        if (isEventTerminated(e) || e.status !== 'published') return -1;
        const likes = e.likes_count || 0;
        const attendees = e.attendees_count || 0;
        const views = e.views_count || 0;
        let score = likes * 3 + attendees * 4 + views * 0.5;
        const startsAt = new Date(e.starts_at || 0).getTime();
        const now = Date.now();
        const diffDays = (startsAt - now) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 7) score += 20;
        if (diffDays >= 0 && diffDays <= 2) score += 15;
        return score;
      };

      const sortEventsWithActiveFirst = (list: Event[]) => {
        return [...list].sort((a, b) => {
          const endedA = isEventTerminated(a);
          const endedB = isEventTerminated(b);
          if (endedA !== endedB) return endedA ? 1 : -1;
          const timeA = new Date(a.starts_at || 0).getTime();
          const timeB = new Date(b.starts_at || 0).getTime();
          return timeA - timeB;
        });
      };

      // Master pool of all unique published events from any of the discovery queries
      const allRaw = [...feat, ...up, ...trend];
      const masterMap = new Map<string, Event>();
      allRaw.forEach((ev) => {
        if (ev && ev.id && isRealEvent(ev) && ev.status === 'published') {
          masterMap.set(ev.id, ev);
        }
      });
      const masterEvents = sortEventsWithActiveFirst(Array.from(masterMap.values()));
      setAllEvents(masterEvents);

      // La section "À la une" doit EXCLUSIVEMENT contenir des événements actifs (non terminés) - plafonné à 5 max
      const activeMaster = masterEvents.filter((e) => !isEventTerminated(e));
      const activeFeat = feat.filter((e) => isRealEvent(e) && e.status === 'published' && !isEventTerminated(e));

      const newFeat = (activeFeat.length > 0
        ? activeFeat
        : activeMaster.filter((e) => e.is_featured).length > 0
          ? activeMaster.filter((e) => e.is_featured)
          : activeMaster
      ).slice(0, 5);

      // Algorithme tendances : tri par score pondéré et plafonnement strict à 5 pour éviter tout flux infini
      const poolForTrending = masterEvents.filter((e) => !isEventTerminated(e));
      const sortedTrending = [...poolForTrending].sort(
        (a, b) => calculateTrendingScore(b) - calculateTrendingScore(a)
      );
      const newTrend = sortedTrending.slice(0, 5);

      // Proximité / sorties : plafonnement à 6 cartes maximum
      const validUp = sortEventsWithActiveFirst(up.filter((e) => e.status === 'published' && !isEventTerminated(e)));
      const newNearby = (validUp.length > 0 ? validUp : masterEvents).slice(0, 6);

      const cappedArtists = art.slice(0, 8);
      const cappedOrgs = orgs.slice(0, 6);

      setFeatured(newFeat);
      setTrending(newTrend);
      setNearby(newNearby);
      setArtists(cappedArtists);
      setOrganizations(cappedOrgs);
      setPlatformStats(stats);

      // Save fresh data into the 0ms synchronous cache
      saveCachedHomeData({
        featured: newFeat,
        trending: newTrend,
        nearby: newNearby,
        artists: cappedArtists,
        organizations: cappedOrgs,
        stats,
      });
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine && !silent) {
        onToastRef.current({
          message: 'Mode hors-ligne : données sauvegardées affichées',
          type: 'info',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [initialCache.hasCache]);

  // Initial load
  useEffect(() => {
    refreshHomeData(false);
  }, [refreshHomeData]);

  // Real-time synchronization on database changes (INSERT, UPDATE, DELETE)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleDbChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshHomeData(true);
      }, 500);
    };

    const unsubscribeEvents = subscribeToGlobalEventsLive(handleDbChange);
    const unsubscribeStats = subscribeToPlatformStatsLive(() => {
      fetchPlatformStats().then((newStats) => {
        if (newStats) setPlatformStats(newStats);
      }).catch(() => {});
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeStats) unsubscribeStats();
    };
  }, [refreshHomeData]);

  // Proactive automatic foreground / event-based auto-refresh (Cycle 3 secondes max)
  useEffect(() => {
    const handleSyncTrigger = () => {
      refreshHomeData(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshHomeData(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleSyncTrigger);
    window.addEventListener('online', handleSyncTrigger);
    window.addEventListener('gba-refresh-events', handleSyncTrigger);
    window.addEventListener('gba-event-created', handleSyncTrigger);
    window.addEventListener('gba-event-updated', handleSyncTrigger);
    window.addEventListener('gba-ticket-booked', handleSyncTrigger);

    // Auto-polling silencieux toutes les 3 secondes max (uniquement si page active/visible)
    const periodicSync = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshHomeData(true);
      }
    }, 3000);

    // Ticker silencieux pour purger tout événement qui viendrait d'expirer
    const pruneTicker = setInterval(() => {
      setFeatured((prev) => prev.filter((e) => !isEventTerminated(e)));
      setTrending((prev) => prev.filter((e) => !isEventTerminated(e)));
      setNearby((prev) => prev.filter((e) => !isEventTerminated(e)));
      setAllEvents((prev) => prev.filter((e) => !isEventTerminated(e)));
    }, 3000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleSyncTrigger);
      window.removeEventListener('online', handleSyncTrigger);
      window.removeEventListener('gba-refresh-events', handleSyncTrigger);
      window.removeEventListener('gba-event-created', handleSyncTrigger);
      window.removeEventListener('gba-event-updated', handleSyncTrigger);
      window.removeEventListener('gba-ticket-booked', handleSyncTrigger);
      clearInterval(periodicSync);
      clearInterval(pruneTicker);
    };
  }, [refreshHomeData]);

  // Unified list of all unique active published events
  const allActiveEvents = useMemo(() => {
    const map = new Map<string, Event>();
    [...allEvents, ...featured, ...trending, ...nearby].forEach((e) => {
      if (e && e.id && isEventActive(e) && !isEventTerminated(e)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  }, [allEvents, featured, trending, nearby]);

  // Category events fetch
  useEffect(() => {
    if (!selectedCategory) {
      setCategoryEvents([]);
      return;
    }
    const immediateMatches = allActiveEvents.filter((e) => eventMatchesCategoryFilter(e, selectedCategory));
    if (immediateMatches.length > 0) {
      setCategoryEvents(immediateMatches);
    } else {
      setCategoryLoading(true);
    }
    fetchEventsByCategory(selectedCategory)
      .then((res) => {
        const active = res.filter((e) => e.status === 'published' && !isEventTerminated(e));
        if (active.length > 0 || immediateMatches.length === 0) {
          setCategoryEvents(active);
        }
      })
      .catch(() => {
        if (immediateMatches.length === 0) setCategoryEvents([]);
      })
      .finally(() => setCategoryLoading(false));
  }, [selectedCategory, allActiveEvents]);

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

  // Section: Proximité / Sorties locales adaptées (uniquement si l'utilisateur a autorisé la localisation)
  const nearbySectionData = useMemo(() => {
    // Ne pas afficher la section de lieu si l'utilisateur n'a pas autorisé la géolocalisation
    if (!userLocation.isActual) {
      return {
        title: '',
        subtitle: '',
        events: [],
        isActual: false,
      };
    }

    const sorted = [...allEventsWithDistance]
      .filter((e) => typeof e.distanceKm === 'number')
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    const strictlyUnder10 = sorted.filter((e) => typeof e.distanceKm === 'number' && e.distanceKm <= 10.0);
    const selected = strictlyUnder10.length > 0 ? strictlyUnder10 : sorted;

    // Plafonnement strict à 12 événements max pour garder le flux fini et performant
    return {
      title: 'À proximité de vous',
      subtitle: `Autour de votre position (${userLocation.cityName || 'GPS'})`,
      events: selected.slice(0, 12),
      isActual: true,
    };
  }, [allEventsWithDistance, userLocation]);

  // Section: Recommandations personnalisées (Algorithme fondé sur les préférences, abonnements, favoris et popularité)
  const recommendedEvents = useMemo(() => {
    const userPrefs = (user?.preferred_genres || [])
      .map((g) => g.toLowerCase().trim())
      .filter(Boolean);
    const excludedIds = new Set([...featured.map((e) => e.id), ...trending.map((e) => e.id)]);

    const candidates = allEventsWithDistance.filter((e) => !excludedIds.has(e.id));

    const scored = candidates.map((event) => {
      let score = 0;
      const cat = (event.category || '').toLowerCase();
      const title = (event.title || '').toLowerCase();

      // 1. Préférences déclarées de genres musicaux
      if (userPrefs.some((pref) => cat.includes(pref) || title.includes(pref))) {
        score += 35;
      }

      // 2. Organisation ou artiste suivi
      if (
        (event.organizer_id && followedOrgIds.has(event.organizer_id)) ||
        (event.artist_id && followedArtistIds.has(event.artist_id))
      ) {
        score += 40;
      }

      // 3. Événement liké / mis en favoris
      if (likedEventIds.has(event.id)) {
        score += 25;
      }

      // 4. Popularité réelle de la communauté (engagement vérifié)
      score += Math.min(25, (event.attendees_count || 0) * 3 + (event.views_count || 0) * 0.4);

      // 5. Événement à venir dans les 14 jours
      const startsAt = new Date(event.starts_at || 0).getTime();
      const diffDays = (startsAt - Date.now()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 14) score += 15;

      return { event, score };
    });

    // Tri par score décroissant et plafonnement strict à 12 événements max (flux fini)
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((s) => s.event);
  }, [allEventsWithDistance, featured, trending, user, followedOrgIds, followedArtistIds, likedEventIds]);

  // Section: Événements 100% Gratuits (plafonné à 4 max)
  const freeEvents = useMemo(() => {
    return allEventsWithDistance.filter((event) => event.price_min === 0 || event.is_free).slice(0, 4);
  }, [allEventsWithDistance]);

  // Section: À ne pas manquer (fort engagement, exclus ceux déjà en vedette ou en tendance - max 4)
  const unmissableEvents = useMemo(() => {
    const excludedIds = new Set([...featured.map((e) => e.id), ...trending.map((e) => e.id)]);
    return [...allEventsWithDistance]
      .filter((e) => !excludedIds.has(e.id) && ((e.attendees_count || 0) > 0 || (e.views_count || 0) >= 10))
      .sort((a, b) => ((b.attendees_count || 0) * 2 + (b.views_count || 0)) - ((a.attendees_count || 0) * 2 + (a.views_count || 0)))
      .slice(0, 4);
  }, [allEventsWithDistance, featured, trending]);

  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Salut';
    if (hour >= 18 && hour < 23) return 'Bonsoir';
    return 'Douce nuit';
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* En-tête modernisée style iOS avec respect de la zone de sécurité (Dynamic Island & Encoche) */}
      <header className="px-5 pt-safe-header pb-3">
        {/* Ligne Logo & Identité */}
  {/* ✅ Retour au logo w-9 h-9 et aux textes 15px / 9px d'origine */}
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
  {/* ✅ Le salut redevient un vrai titre h1 sur sa propre ligne (avant, il était dans la ligne du logo) */}
  <div className="flex items-center justify-between mb-4 mr-2">
    <div>
      <h1 className="text-xl sm:text-2xl font-black text-[#171726] dark:text-white tracking-tight flex items-center gap-1.5">
        <span>{getDynamicGreeting()} {user?.name?.split(' ')[0] || 'Invité'}
        <span className="text-xl"> 👋</span>
        </span>
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Trouve ta prochaine sortie</p>
    </div>

    {/* Boutons d'actions harmonisés (Notification, Paramètres, Profil) */}
    {/* ✅ gap-2 et boutons w-10 h-10 d'origine (avant : gap-1.5 et w-9 h-9) */}
    <div className="flex items-center gap-2">
      {/* ✅ Appel direct, sans le wrapper haptic */}
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
      {/* ✅ px-4 py-3, gap-3 et texte responsive d'origine */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-xs hover:border-[#6600FF]/30 transition-all">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-xs sm:text-sm text-gray-400 font-medium">Concerts, soirées, festivals...</span>
      </div>
    </button>

    {/* ✅ w-12 h-12 d'origine et onClick direct.
        Ça corrige aussi l'ancien onOpenAIAssistant() appelé sans vérification,
        alors que la prop est optionnelle. */}
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
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 py-1">
          {EVENT_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Music;
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  haptic.selection();
                  setSelectedCategory(isActive ? null : cat.value);
                }}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : categoryEvents.length === 0 ? (
            <EmptyState title="Aucun événement" description="Pas d'événement dans cette catégorie pour le moment" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* SECTION 4: Proximité / Sorties locales (Strictement masqué si la localisation n'est pas autorisée) */}
      {userLocation.isActual && nearbySectionData.events.length > 0 && (
        <section className="mt-8 px-5" aria-label={nearbySectionData.title}>
          {/* En-tête aérée et ergonomique (iOS 27 - Zéro troncature) */}
          <div className="flex flex-col gap-1.5 mb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Navigation className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-[-0.03em] text-[#17131d] dark:text-white leading-tight">
                  {nearbySectionData.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSeeMoreType('nearby')}
                className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0"
              >
                <span>Voir plus</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex items-center gap-2 pl-10.5">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {nearbySectionData.subtitle}
              </span>
            </div>
          </div>

          {/* Tuiles défilables horizontales modernes compactes */}
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1.5 -mx-5 px-5">
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
      )}

      {/* SECTION 5: Recommandé pour vous (Algorithme fondé sur les goûts, affinités et tendances) */}
      {recommendedEvents.length > 0 && (
        <section className="mt-9 px-5" aria-label="Recommandations personnalisées">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#6600FF] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
                  Recommandé pour vous
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Sélection intelligente selon vos goûts et affinités
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {recommendedEvents.slice(0, 4).map((event) => (
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {unmissableEvents.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 8: Artistes du moment (vrais comptes artistes) */}
      {artists.length > 0 && (
        <section className="mt-8" aria-label="Artistes du moment">
          <div className="px-5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white truncate">
                  Artistes du moment
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                  Talents et créateurs de la communauté
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('artists')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0 ml-2"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3.5 items-start overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory scroll-pl-5">
              {artists.map((artist) => {
                const followersCount = artist.followers_count ?? 0;
                const fansText =
                  followersCount > 1000
                    ? `${(followersCount / 1000).toFixed(1)}K fans`
                    : `${followersCount} fan${followersCount > 1 ? 's' : ''}`;
                return (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => onArtistClick?.(artist)}
                    className="group flex flex-col items-center gap-2 w-20 shrink-0 snap-start active:scale-95 transition-transform duration-200 ease-out cursor-pointer text-center"
                  >
                    <UserAvatar
                      src={artist.photo_url}
                      name={artist.name}
                      role="artist"
                      size="md"
                      shape="circle"
                      isVerified={artist.is_verified}
                    />
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <span className="text-[11.5px] font-bold text-[#1A1A2E] dark:text-white text-center truncate w-full leading-tight">
                        {artist.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-400 font-semibold text-center truncate w-full leading-tight">
                        {fansText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 9: Organisateurs officiels (vrais comptes organisateurs) */}
      {organizations.length > 0 && (
        <section className="mt-8" aria-label="Organisateurs officiels">
          <div className="px-5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white truncate">
                  Organisateurs officiels
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                  Collectifs et créateurs d’expériences
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSeeMoreType('organizations')}
              className="flex items-center gap-1 text-[13px] font-bold text-[#6600FF] hover:text-[#5200cc] active:scale-95 transition-all bg-[#6600FF]/[0.08] hover:bg-[#6600FF]/15 dark:bg-[#6600FF]/20 px-3 py-1.5 rounded-full cursor-pointer shrink-0 ml-2"
            >
              <span>Voir plus</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3.5 items-start overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory scroll-pl-5">
              {organizations.map((org) => {
                const count = org.events_count ?? 0;
                const countText = `${count} événement${count > 1 ? 's' : ''}`;
                return (
                  <button
                    type="button"
                    key={org.id}
                    onClick={() => onOrganizationClick?.(org)}
                    className="group flex flex-col items-center gap-2 w-20 shrink-0 snap-start active:scale-95 transition-transform duration-200 ease-out cursor-pointer text-center"
                  >
                    <UserAvatar
                      src={org.logo_url}
                      name={org.name}
                      role="organizer"
                      size="md"
                      shape="squircle"
                      isVerified={org.verification_status === 'verified'}
                    />
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <span className="text-[11.5px] font-bold text-[#1A1A2E] dark:text-white text-center truncate w-full leading-tight">
                        {org.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-400 font-semibold text-center truncate w-full leading-tight">
                        {countText}
                      </span>
                    </div>
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
