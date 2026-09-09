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

const CACHE_KEY = 'gbaigbance_home_cache_v3';

/**
 * Returns cached home data synchronously for 0ms instant loading.
 */
export function getCachedHomeData(): { data: HomeCacheData | null; hasCache: boolean } {
  if (MEMORY_CACHE.home && (MEMORY_CACHE.home.featured.length > 0 || MEMORY_CACHE.home.nearby.length > 0)) {
    return { data: MEMORY_CACHE.home, hasCache: true };
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as HomeCacheData;
      if (parsed && (Array.isArray(parsed.featured) || Array.isArray(parsed.nearby))) {
        MEMORY_CACHE.home = parsed;
        return { data: parsed, hasCache: true };
      }
    }
  } catch {
    // Ignore JSON error
  }
  return { data: null, hasCache: false };
}

/**
 * Persists fresh home data in both in-memory and localStorage cache.
 */
export function saveCachedHomeData(data: Omit<HomeCacheData, 'timestamp'>): void {
  const full: HomeCacheData = {
    ...data,
    timestamp: Date.now(),
  };
  MEMORY_CACHE.home = full;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(full));
    }
  } catch {
    // Storage quota or private browsing
  }
}
