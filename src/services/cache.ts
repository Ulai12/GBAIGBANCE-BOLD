import type { Event, Artist, Organization } from '@/types';
import type { PlatformStats } from '@/services/events';

export interface HomeCacheData {
  featured: Event[];
  trending: Event[];
  nearby: Event[];
  artists: Artist[];
  organizations: Organization[];
  stats: PlatformStats | null;
  timestamp: number;
}

const MEMORY_CACHE: {
  home?: HomeCacheData;
} = {};

const CACHE_KEY = 'gbaigbance_home_cache_v4';
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes TTL

function isValidEvent(e: unknown): e is Event {
  if (!e || typeof e !== 'object') return false;
  const evt = e as Partial<Event>;
  return Boolean(evt.id && evt.title && evt.starts_at && evt.status === 'published');
}

/**
 * Returns cached home data synchronously for 0ms instant loading.
 */
export function getCachedHomeData(): { data: HomeCacheData | null; hasCache: boolean; isStale: boolean } {
  const now = Date.now();

  if (
    MEMORY_CACHE.home &&
    (MEMORY_CACHE.home.featured.length > 0 || MEMORY_CACHE.home.nearby.length > 0)
  ) {
    const isStale = now - (MEMORY_CACHE.home.timestamp || 0) > CACHE_TTL_MS;
    return { data: MEMORY_CACHE.home, hasCache: true, isStale };
  }

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as HomeCacheData;
      if (
        parsed &&
        Array.isArray(parsed.featured) &&
        Array.isArray(parsed.nearby)
      ) {
        // Sanitize cache: ensure all cached events are valid
        parsed.featured = parsed.featured.filter(isValidEvent);
        parsed.trending = (parsed.trending || []).filter(isValidEvent);
        parsed.nearby = parsed.nearby.filter(isValidEvent);

        if (parsed.featured.length > 0 || parsed.nearby.length > 0) {
          MEMORY_CACHE.home = parsed;
          const isStale = now - (parsed.timestamp || 0) > CACHE_TTL_MS;
          return { data: parsed, hasCache: true, isStale };
        }
      }
    }
  } catch {
    // Ignore parse error
  }

  return { data: null, hasCache: false, isStale: true };
}

/**
 * Persists fresh home data in both in-memory and localStorage cache.
 */
export function saveCachedHomeData(data: Omit<HomeCacheData, 'timestamp'>): void {
  const sanitized: HomeCacheData = {
    featured: data.featured.filter(isValidEvent),
    trending: (data.trending || []).filter(isValidEvent),
    nearby: data.nearby.filter(isValidEvent),
    artists: data.artists || [],
    organizations: data.organizations || [],
    stats: data.stats || null,
    timestamp: Date.now(),
  };

  MEMORY_CACHE.home = sanitized;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Storage quota or private browsing
  }
}

/**
 * Clears all cached home and entity data
 */
export function clearCachedHomeData(): void {
  delete MEMORY_CACHE.home;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('gbaigbance_home_cache_v3');
    }
  } catch {
    // Ignore error
  }
}
