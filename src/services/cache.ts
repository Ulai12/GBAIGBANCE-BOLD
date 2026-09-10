import { get, set, del, keys } from 'idb-keyval';
import { useState, useEffect, useRef } from 'react';
import type { Event, EventWithRelations, Artist, Organization, Profile, Ticket } from '@/types';
import type { PlatformStats } from '@/services/events';
import { sanitizeProfileSnapshot } from '@/hooks/useLocalProfile';

/**
 * CACHE PHILOSOPHY (Stale-While-Revalidate):
 * 1. Service Worker: App Shell + Fonts + Images (Unsplash, Pexels, Supabase Storage).
 * 2. IndexedDB (idb-keyval): Application Data. Instant 0ms paint from last known state,
 *    background network revalidation.
 * 
 * STRICT SECURITY & INTEGRITY BOUNDARIES:
 * DO NOT PERSIST IN SW OR PUBLIC CACHE:
 * - Tickets (QR codes, validation tokens, status)
 * - Booking / checkout transactions
 * - Notifications & live unread counters
 * - Live inventory / ticket availability counters (always re-fetch on tap 'Réserver' and trust RPC)
 * - Authorization headers / bearer tokens
 */

export interface HomeCacheData {
  featured: Event[];
  trending: Event[];
  nearby: Event[];
  artists: Artist[];
  organizations: Organization[];
  stats: PlatformStats | null;
  timestamp: number;
}

interface CacheWrapper<T> {
  data: T;
  timestamp: number;
}

const MEMORY_CACHE: {
  home?: HomeCacheData;
  events?: Map<string, CacheWrapper<EventWithRelations>>;
  profiles?: Map<string, CacheWrapper<Profile>>;
} = {
  events: new Map(),
  profiles: new Map(),
};

const HOME_CACHE_KEY = 'gba_idb_home_v5';
const EVENT_CACHE_PREFIX = 'gba_idb_event_';
const PROFILE_CACHE_PREFIX = 'gba_idb_profile_';
export const TICKETS_CACHE_PREFIX = 'gba_my_tickets_';

export const HOME_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
export const EVENT_CACHE_TTL_MS = 1000 * 60 * 5;  // 5 minutes
export const PROFILE_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function isValidEvent(e: unknown): e is Event {
  if (!e || typeof e !== 'object') return false;
  const evt = e as Partial<Event>;
  return Boolean(evt.id && evt.title && evt.starts_at && evt.status === 'published');
}

function stripEventForDigest(e: Event): Event {
  return {
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    location_name: e.location_name,
    city: e.city,
    country: e.country,
    cover_url: e.cover_url,
    price_min: e.price_min,
    price_max: e.price_max,
    currency: e.currency,
    category: e.category,
    status: e.status,
    is_featured: e.is_featured,
    is_trending: e.is_trending,
    total_tickets: e.total_tickets,
    attendees_count: e.attendees_count,
    likes_count: e.likes_count,
  } as Event;
}

// Hydrate memory cache asynchronously from IndexedDB on startup
if (typeof window !== 'undefined') {
  get<HomeCacheData>(HOME_CACHE_KEY)
    .then((idbData) => {
      if (idbData && Array.isArray(idbData.featured)) {
        if (!MEMORY_CACHE.home || (idbData.timestamp || 0) > (MEMORY_CACHE.home.timestamp || 0)) {
          MEMORY_CACHE.home = idbData;
        }
      }
    })
    .catch(() => {});
}

/**
 * Returns cached home data synchronously for 0ms instant first-paint.
 * Checks Memory -> localStorage. (IndexedDB updates memory in background).
 */
export function getCachedHomeData(): { data: HomeCacheData | null; hasCache: boolean; isStale: boolean } {
  const now = Date.now();

  if (
    MEMORY_CACHE.home &&
    (MEMORY_CACHE.home.featured.length > 0 || MEMORY_CACHE.home.nearby.length > 0)
  ) {
    const isStale = now - (MEMORY_CACHE.home.timestamp || 0) > HOME_CACHE_TTL_MS;
    return { data: MEMORY_CACHE.home, hasCache: true, isStale };
  }

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(HOME_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as HomeCacheData;
      if (parsed && Array.isArray(parsed.featured) && Array.isArray(parsed.nearby)) {
        parsed.featured = parsed.featured.filter(isValidEvent);
        parsed.trending = (parsed.trending || []).filter(isValidEvent);
        parsed.nearby = parsed.nearby.filter(isValidEvent);

        if (parsed.featured.length > 0 || parsed.nearby.length > 0) {
          MEMORY_CACHE.home = parsed;
          const isStale = now - (parsed.timestamp || 0) > HOME_CACHE_TTL_MS;
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
 * Persists fresh home data across Memory, LocalStorage, and IndexedDB.
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

  // 1. Synchronous lightweight digest in localStorage for immediate 0ms boot without quota exhaustion
  try {
    if (typeof window !== 'undefined') {
      const digest: HomeCacheData = {
        featured: sanitized.featured.slice(0, 15).map(stripEventForDigest),
        trending: sanitized.trending.slice(0, 10).map(stripEventForDigest),
        nearby: sanitized.nearby.slice(0, 10).map(stripEventForDigest),
        artists: sanitized.artists.slice(0, 8),
        organizations: sanitized.organizations.slice(0, 6),
        stats: sanitized.stats,
        timestamp: sanitized.timestamp,
      };
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(digest));
    }
  } catch {
    // LocalStorage quota may be exceeded on constrained devices
  }

  // 2. Persistent complete IndexedDB via idb-keyval (handles large payloads without quota issues)
  set(HOME_CACHE_KEY, sanitized).catch(() => {});
}

/**
 * Public Event Detail Cache (IndexedDB + Memory)
 */
export async function getPublicEventCache(eventId: string): Promise<{ data: EventWithRelations | null; isStale: boolean }> {
  const now = Date.now();

  // Check memory
  const mem = MEMORY_CACHE.events?.get(eventId);
  if (mem) {
    const isStale = now - mem.timestamp > EVENT_CACHE_TTL_MS;
    return { data: mem.data, isStale };
  }

  // Check IndexedDB
  try {
    const idbItem = await get<CacheWrapper<EventWithRelations>>(`${EVENT_CACHE_PREFIX}${eventId}`);
    if (idbItem && idbItem.data) {
      MEMORY_CACHE.events?.set(eventId, idbItem);
      const isStale = now - idbItem.timestamp > EVENT_CACHE_TTL_MS;
      return { data: idbItem.data, isStale };
    }
  } catch {
    // Ignore
  }

  return { data: null, isStale: true };
}

export async function setPublicEventCache(eventId: string, data: EventWithRelations): Promise<void> {
  const wrapper: CacheWrapper<EventWithRelations> = {
    data,
    timestamp: Date.now(),
  };
  MEMORY_CACHE.events?.set(eventId, wrapper);
  try {
    await set(`${EVENT_CACHE_PREFIX}${eventId}`, wrapper);
  } catch {
    // Ignore IDB failure
  }
}

/**
 * Public Profile Cache (IndexedDB + Memory)
 */
export async function getPublicProfileCache(userId: string): Promise<{ data: Profile | null; isStale: boolean }> {
  const now = Date.now();

  const mem = MEMORY_CACHE.profiles?.get(userId);
  if (mem) {
    const isStale = now - mem.timestamp > PROFILE_CACHE_TTL_MS;
    return { data: mem.data, isStale };
  }

  try {
    const idbItem = await get<CacheWrapper<Profile>>(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (idbItem && idbItem.data) {
      MEMORY_CACHE.profiles?.set(userId, idbItem);
      const isStale = now - idbItem.timestamp > PROFILE_CACHE_TTL_MS;
      return { data: idbItem.data, isStale };
    }
  } catch {
    // Ignore
  }

  return { data: null, isStale: true };
}

export async function setPublicProfileCache(userId: string, data: Profile): Promise<void> {
  const wrapper: CacheWrapper<Profile> = {
    data,
    timestamp: Date.now(),
  };
  MEMORY_CACHE.profiles?.set(userId, wrapper);
  try {
    await set(`${PROFILE_CACHE_PREFIX}${userId}`, wrapper);
  } catch {
    // Ignore
  }
}

/**
 * Generic Stale-While-Revalidate React Hook
 */
export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    initialData?: T;
    onOffline?: () => void;
  }
) {
  const ttl = options?.ttlMs || 1000 * 60 * 10;
  const [data, setData] = useState<T | undefined>(options?.initialData);
  const [loading, setLoading] = useState<boolean>(!options?.initialData);
  const [isOffline, setIsOffline] = useState(false);
  const fetchedRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  const ttlRef = useRef(ttl);

  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
    ttlRef.current = ttl;
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      // 1. Read from IndexedDB / memory
      try {
        const cached = await get<CacheWrapper<T>>(`gba_resource_${key}`);
        if (cached && isMounted) {
          setData(cached.data);
          setLoading(false);
          const isFresh = Date.now() - cached.timestamp < ttlRef.current;
          if (isFresh && fetchedRef.current) return;
        }
      } catch {
        // Continue to network
      }

      // 2. Fetch fresh network data in parallel
      try {
        fetchedRef.current = true;
        const fresh = await fetcherRef.current();
        if (isMounted) {
          setData(fresh);
          setLoading(false);
          setIsOffline(false);
        }
        // Write to IndexedDB
        set(`gba_resource_${key}`, { data: fresh, timestamp: Date.now() }).catch(() => {});
      } catch {
        if (isMounted) {
          setLoading(false);
          if (!navigator.onLine) {
            setIsOffline(true);
            optionsRef.current?.onOffline?.();
          }
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [key]);

  return { data, loading, isOffline };
}

/**
 * Hydrates cache from IndexedDB in the background if localStorage was purged.
 */
export async function hydrateHomeFromIndexedDB(): Promise<HomeCacheData | null> {
  try {
    const cached = await get<HomeCacheData>(HOME_CACHE_KEY);
    if (cached && (cached.featured?.length > 0 || cached.nearby?.length > 0)) {
      MEMORY_CACHE.home = cached;
      return cached;
    }
  } catch {
    // Ignore IDB read error
  }
  return null;
}

/**
 * Saves authenticated user profile snapshot to localStorage and IndexedDB.
 * Uses sanitizeProfileSnapshot to strip sensitive data (gemini_config, API keys, email, phone).
 */
export async function saveCachedProfile(profile: Profile | null): Promise<void> {
  try {
    const snapshot = sanitizeProfileSnapshot(profile);
    if (typeof window !== 'undefined') {
      if (snapshot) {
        localStorage.setItem('gba_profile', JSON.stringify(snapshot));
        await set('gba_profile_idb', { data: snapshot, timestamp: Date.now() });
      } else {
        localStorage.removeItem('gba_profile');
        await del('gba_profile_idb');
      }
    }
  } catch {
    // Ignore error
  }
}

/**
 * Gets cached profile snapshot from localStorage or IndexedDB
 */
export async function getCachedProfile(): Promise<Profile | null> {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('gba_profile');
      if (raw) return JSON.parse(raw) as Profile;
      const idb = await get<CacheWrapper<Profile>>('gba_profile_idb');
      if (idb?.data) return idb.data;
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * PRIVATE OFFLINE TICKETS CACHE (IndexedDB only)
 * Stored securely in IndexedDB under `gba_my_tickets_${userId}`.
 * NEVER stored in Workbox, NEVER in Service Worker cache.
 * Ensures the QR code and ticket access pass are fully visible at concert gates
 * even when 4G mobile network is completely unreachable in Lomé or Cotonou.
 */
export async function getCachedUserTickets(userId: string): Promise<(Ticket & { event?: Event })[] | null> {
  if (!userId) return null;
  try {
    const cached = await get<(Ticket & { event?: Event })[]>(`${TICKETS_CACHE_PREFIX}${userId}`);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch {
    // Ignore IDB read error
  }
  return null;
}

export async function saveCachedUserTickets(userId: string, tickets: (Ticket & { event?: Event })[]): Promise<void> {
  if (!userId || !Array.isArray(tickets)) return;
  try {
    await set(`${TICKETS_CACHE_PREFIX}${userId}`, tickets);
  } catch {
    // Ignore error
  }
}

export async function clearCachedUserTickets(userId?: string): Promise<void> {
  try {
    if (userId) {
      await del(`${TICKETS_CACHE_PREFIX}${userId}`);
    } else {
      const allKeys = await keys();
      for (const k of allKeys) {
        if (typeof k === 'string' && k.startsWith(TICKETS_CACHE_PREFIX)) {
          await del(k);
        }
      }
    }
  } catch {
    // Ignore error
  }
}

/**
 * Clear all cached public and private data
 */
export async function clearAllLocalCache(): Promise<void> {
  delete MEMORY_CACHE.home;
  MEMORY_CACHE.events?.clear();
  MEMORY_CACHE.profiles?.clear();
  try {
    localStorage.removeItem(HOME_CACHE_KEY);
    localStorage.removeItem('gba_profile');
    await del(HOME_CACHE_KEY);
    await del('gba_profile_idb');

    const allKeys = await keys();
    for (const k of allKeys) {
      if (
        typeof k === 'string' &&
        (k.startsWith(EVENT_CACHE_PREFIX) ||
         k.startsWith(PROFILE_CACHE_PREFIX) ||
         k.startsWith(TICKETS_CACHE_PREFIX))
      ) {
        await del(k);
      }
    }
  } catch {
    // Ignore
  }
}
