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

  // NOTE: REST OF FILE CONTINUES - this is a partial push test
  return null;
}
