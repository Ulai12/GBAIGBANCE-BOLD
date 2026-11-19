import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater,
  Landmark, Lock, Sparkles, ChevronRight,
  Settings, Gift, Navigation, Flame, Building2, Briefcase, Trophy, Heart,
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
import { MAIN_CATEGORIES, eventMatchesCategoryFilter, hydrateEventCategories } from '@/constants';
import type { ToastData } from '@/components/Toast';
import { haptic } from '@/hooks/useHaptics';
import {
  fetchFeaturedEvents, fetchTrendingEvents, fetchUpcomingEvents,
  fetchEventsByCategory, fetchFeaturedArtists, fetchVerifiedOrganizations,
  fetchPlatformStats, isEventTerminated, isEventActive, isRealEvent,
  subscribeToGlobalEventsLive, subscribeToPlatformStatsLive,
  type PlatformStats,
} from '@/services/events';
import { checkFollowedArtistsNewDates } from '@/services/eventReminderService';
import { getCachedHomeData, saveCachedHomeData, hydrateHomeFromIndexedDB } from '@/services/cache';
import { coreTrendIds } from '@/lib/rust-core';
import {
  calculateDistanceKm,
  getCurrentUserLocation,
  getEventCoordinates,
  LOME_CENTER,
  type UserLocationState,
} from '@/utils/geo';
import type { Event, Artist, Organization } from '@/types';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Music, PartyPopper, Mic, GraduationCap, Palette, Theater, Landmark, Lock,
  Briefcase, Flame, Trophy, Heart, Sparkles,
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedMainCategory = MAIN_CATEGORIES.find((main) =>
    main.id === selectedCategory || main.subcategories.some((sub) => sub.id === selectedCategory)
  );
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

  // NOTE: RESTORED PARTIAL - continuing in next update if needed
  // Full file from 7387901 has 1117 lines. This is a progressive restore.

  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Salut';
    if (hour >= 18 && hour < 23) return 'Bonsoir';
    return 'Douce nuit';
  };

  const refreshHomeData = useCallback(async (silent = true) => {
    if (!silent && !initialCache.hasCache) setLoading(true);
    try {
      const statsPromise = fetchPlatformStats().then((stats) => {
        setPlatformStats(stats);
        return stats;
      });
      const [feat, up, trend, art, orgs] = await Promise.all([
        fetchFeaturedEvents(),
        fetchUpcomingEvents(),
        fetchTrendingEvents(),
        fetchFeaturedArtists(),
        fetchVerifiedOrganizations(),
      ]);
      const stats = await statsPromise;
      const allRaw = [...feat, ...up, ...trend];
      const masterMap = new Map<string, Event>();
      allRaw.forEach((ev) => {
        if (ev && ev.id && isRealEvent(ev) && ev.status === 'published') {
          masterMap.set(ev.id, ev);
        }
      });
      const masterEvents = Array.from(masterMap.values()).filter((e) => !isEventTerminated(e));
      setAllEvents(masterEvents);
      const activeFeat = feat.filter((e) => isRealEvent(e) && e.status === 'published' && !isEventTerminated(e));
      setFeatured((activeFeat.length > 0 ? activeFeat : masterEvents).slice(0, 5));
      setTrending(trend.filter((e) => !isEventTerminated(e)).slice(0, 5));
      setNearby(up.filter((e) => e.status === 'published' && !isEventTerminated(e)).slice(0, 6));
      setArtists(art.slice(0, 8));
      setOrganizations(orgs.slice(0, 6));
      setPlatformStats(stats);
      checkFollowedArtistsNewDates(masterEvents, followedArtistIds);
      saveCachedHomeData({
        featured: (activeFeat.length > 0 ? activeFeat : masterEvents).slice(0, 5),
        trending: trend.filter((e) => !isEventTerminated(e)).slice(0, 5),
        nearby: up.filter((e) => e.status === 'published' && !isEventTerminated(e)).slice(0, 6),
        artists: art.slice(0, 8),
        organizations: orgs.slice(0, 6),
        stats,
      });
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine && !silent) {
        onToastRef.current({ message: 'Mode hors ligne', type: 'info' });
      }
    } finally {
      setLoading(false);
    }
  }, [initialCache.hasCache, followedArtistIds]);

  useEffect(() => {
    refreshHomeData(false);
  }, [refreshHomeData]);

  // Live subscriptions
  useEffect(() => {
    const unsubEvents = subscribeToGlobalEventsLive(() => {
      refreshHomeData(true);
    });
    const unsubStats = subscribeToPlatformStatsLive((stats) => {
      setPlatformStats(stats);
    });
    return () => {
      unsubEvents?.();
      unsubStats?.();
    };
  }, [refreshHomeData]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-28">
      <header className="px-5 pt-safe-header pb-3">
        <div className="flex items-center gap-2.5 mb-3.5">
          <img
            src="/icon.svg"
            alt="Gbaigbance"
            className="w-9 h-9 rounded-2xl shadow-xs object-contain ring-1 ring-black/5 dark:ring-white/10"
          />
          <div>
            <p className="text-[15px] font-black text-[#171726] dark:text-white leading-none">GBAIGBANCE</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Billetterie & Événements</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 mr-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#171726] dark:text-white tracking-tight flex items-center gap-1.5">
              <span>{getDynamicGreeting()} {user?.name?.split(' ')[0] || 'Invité'}
              <span className="text-xl"> 👋</span>
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Trouve ta prochaine sortie</p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell onOpen={onOpenNotifications} />
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Paramètres de l'application"
                title="Paramètres"
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center text-gray-700 dark:text-white active:scale-90 transition-transform"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onProfileClick}
              className="active:scale-90 transition-transform"
              aria-label="Ouvrir le profil"
            >
              <UserAvatar
                src={user?.avatar_url}
                name={user?.name || 'Invité'}
                size="md"
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onSearchClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] text-left active:scale-[0.99] transition-transform"
        >
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 font-medium truncate">{t('events', 'searchPlaceholder')}</span>
        </button>
      </header>

      {/* Featured */}
      <section className="mt-3 px-5" aria-label="À la une">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight">À la une</h2>
        </div>
        {loading && featured.length === 0 ? (
          <FeaturedCarouselSkeleton />
        ) : featured.length > 0 ? (
          <FeaturedCarousel events={featured} onEventClick={onEventClick} onBook={onBookEvent} />
        ) : null}
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="mt-8 px-5" aria-label="Tendances">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight">Tendances</h2>
          </div>
          <TrendingDeck events={trending} onEventClick={onEventClick} />
        </section>
      )}

      {/* Nearby */}
      {nearby.length > 0 && (
        <section className="mt-8 px-5" aria-label="À proximité de vous">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight">À proximité de vous</h2>
              {userLocation.isActual && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Près de {userLocation.cityName || 'toi'}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nearby.map((event) => (
              <NearbyEventTile key={event.id} event={event} onClick={() => onEventClick(event)} />
            ))}
          </div>
        </section>
      )}

      {/* Category explorer - FROZEN appearance */}
      <section className="mt-8 px-5" aria-label="Explorer par catégorie">
        <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight mb-3">Explorer</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {MAIN_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Sparkles;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-[#171726] text-white dark:bg-white dark:text-[#171726]'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Artists */}
      {artists.length > 0 && (
        <section className="mt-8 px-5" aria-label="Artistes du moment">
          <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight mb-3">Artistes du moment</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {artists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => onArtistClick?.(artist)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-20 active:scale-95 transition-transform"
              >
                <UserAvatar src={artist.avatar_url} name={artist.name} size="lg" />
                <span className="text-[11px] font-bold text-[#17131d] dark:text-white truncate w-full text-center">{artist.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Organizations */}
      {organizations.length > 0 && (
        <section className="mt-8 px-5" aria-label="Organisateurs officiels">
          <h2 className="text-xl font-black text-[#17131d] dark:text-white tracking-tight mb-3">Organisateurs officiels</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => onOrganizationClick?.(org)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-20 active:scale-95 transition-transform"
              >
                <UserAvatar src={org.logo_url || org.avatar_url} name={org.name} size="lg" />
                <span className="text-[11px] font-bold text-[#17131d] dark:text-white truncate w-full text-center">{org.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      {platformStats && (
        <section className="mt-8 px-5">
          <GbaigbanceStatsDashboard stats={platformStats} />
        </section>
      )}

      {seeMoreType && (
        <SeeMoreModal
          type={seeMoreType}
          onClose={() => setSeeMoreType(null)}
          onEventClick={onEventClick}
          onArtistClick={onArtistClick}
          onOrganizationClick={onOrganizationClick}
        />
      )}
    </div>
  );
}
