import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated, hasEventEnded } from './status';
import { coreRankIds, coreTrendIds } from '@/lib/rust-core';

function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

/**
 * Pagine une requête Supabase jusqu'à épuisement des résultats.
 * Utilise .range(from, to) inclusif. Arrête sur erreur, page vide ou page incomplète.
 */
async function selectPages<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const pageSize = 100;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFn(from, to);
    if (error || !data || data.length === 0) break;
    results.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return results;
}

// ==================== STATS ====================

export interface PlatformStats {
  analyticsVersion?: number;
  totalEvents: number;
  totalAllEvents?: number;
  totalArtists: number;
  totalOrganizers: number;
  totalTickets: number;
  totalParticipants: number;
  totalParticipantAccounts?: number;
  totalProfiles?: number;
  totalPendingPlatformInvitations?: number;
  totalUsers: number;
  totalViews: number;
  totalRevenue: number;
  totalCancelledTickets?: number;
  totalRefundedTickets?: number;
  categories: Record<string, number>;
  categoryBasis: 'revenue' | 'events';
  categoryShares: Array<{ id: string; count: number; amount: number; percent: number }>;
  ticketsTimeline?: Array<{
    id: string;
    created_at: string;
    created_at_ms: number;
    price_paid: number;
    quantity: number;
  }>;
  isAvailable?: boolean;
  eventsTimeline: Array<{
    id: string;
    starts_at_ms: number;
    attendees: number;
  }>;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const unavailable: PlatformStats = {
    totalEvents: 0,
    totalAllEvents: 0,
    totalArtists: 0,
    totalOrganizers: 0,
    totalTickets: 0,
    totalParticipants: 0,
    totalParticipantAccounts: 0,
    totalProfiles: 0,
    totalUsers: 0,
    totalViews: 0,
    totalRevenue: 0,
    totalCancelledTickets: 0,
    totalRefundedTickets: 0,
    categories: {},
    categoryBasis: 'events',
    categoryShares: [],
    ticketsTimeline: [],
    eventsTimeline: [],
    isAvailable: false,
  };

  if (!isSupabaseConfigured) return unavailable;

  try {
    const { data, error } = await supabase.functions.invoke('platform-stats');
    if (error) {
      console.error('[platform-stats] Trusted analytics endpoint failed:', error);
      return unavailable;
    }

    const stats = parsePlatformStats(data);
    if (!stats) {
      console.error('[platform-stats] Analytics response is invalid or outdated.');
      return unavailable;
    }
    return stats;
  } catch (error) {
    console.error('[platform-stats] Unable to load trusted analytics:', error);
    return unavailable;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function parsePlatformStats(value: unknown): PlatformStats | null {
  const raw = asRecord(value);
  if (!raw || raw.analyticsVersion !== 2 || raw.isAvailable !== true) return null;

  const numberFields = [
    'totalEvents',
    'totalAllEvents',
    'totalArtists',
    'totalOrganizers',
    'totalTickets',
    'totalParticipants',
    'totalParticipantAccounts',
    'totalProfiles',
    'totalPendingPlatformInvitations',
    'totalUsers',
    'totalViews',
    'totalRevenue',
    'totalCancelledTickets',
    'totalRefundedTickets',
  ] as const;
  const numbers = {} as Record<(typeof numberFields)[number], number>;
  for (const field of numberFields) {
    const parsed = nonNegativeNumber(raw[field]);
    if (parsed === null) return null;
    numbers[field] = parsed;
  }

  if (raw.categoryBasis !== 'revenue' && raw.categoryBasis !== 'events') return null;
  const rawCategories = asRecord(raw.categories);
  if (!rawCategories || !Array.isArray(raw.categoryShares)) return null;

  const categories: Record<string, number> = {};
  for (const [id, count] of Object.entries(rawCategories)) {
    const parsed = nonNegativeNumber(count);
    if (parsed === null) return null;
    categories[id] = parsed;
  }

  const categoryShares: PlatformStats['categoryShares'] = [];
  for (const item of raw.categoryShares) {
    const share = asRecord(item);
    const count = nonNegativeNumber(share?.count);
    const amount = nonNegativeNumber(share?.amount);
    const percent = nonNegativeNumber(share?.percent);
    if (!share || typeof share.id !== 'string' || count === null || amount === null || percent === null) {
      return null;
    }
    categoryShares.push({ id: share.id, count, amount, percent });
  }

  if (!Array.isArray(raw.ticketsTimeline) || !Array.isArray(raw.eventsTimeline)) return null;
  const ticketsTimeline: NonNullable<PlatformStats['ticketsTimeline']> = [];
  for (const item of raw.ticketsTimeline) {
    const ticket = asRecord(item);
    const createdAtMs = nonNegativeNumber(ticket?.created_at_ms);
    const pricePaid = nonNegativeNumber(ticket?.price_paid);
    const quantity = nonNegativeNumber(ticket?.quantity);
    if (
      !ticket ||
      typeof ticket.id !== 'string' ||
      typeof ticket.created_at !== 'string' ||
      createdAtMs === null ||
      pricePaid === null ||
      quantity === null
    ) {
      return null;
    }
    ticketsTimeline.push({
      id: ticket.id,
      created_at: ticket.created_at,
      created_at_ms: createdAtMs,
      price_paid: pricePaid,
      quantity,
    });
  }

  const eventsTimeline: PlatformStats['eventsTimeline'] = [];
  for (const item of raw.eventsTimeline) {
    const event = asRecord(item);
    const startsAtMs = nonNegativeNumber(event?.starts_at_ms);
    const attendees = nonNegativeNumber(event?.attendees);
    if (!event || typeof event.id !== 'string' || startsAtMs === null || attendees === null) return null;
    eventsTimeline.push({ id: event.id, starts_at_ms: startsAtMs, attendees });
  }

  return {
    analyticsVersion: 2,
    ...numbers,
    categories,
    categoryBasis: raw.categoryBasis,
    categoryShares,
    ticketsTimeline,
    eventsTimeline,
    isAvailable: true,
  };
}

// ==================== DISCOVERY QUERIES ====================

export async function fetchFeaturedEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(50);

    if (!error && data && data.length > 0) {
      // La section "À la une" doit EXCLUSIVEMENT afficher des événements actifs (non terminés)
      const activeList = (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e));
      const rankedIds = await coreRankIds(
        activeList.map((event) => ({
          id: event.id,
          featured: !!event.is_featured,
          attendees: event.attendees_count || 0,
          views: event.views_count || 0,
          likes: event.likes_count || 0,
        }))
      );
      const byId = new Map(activeList.map((event) => [event.id, event]));
      const sorted = (rankedIds || activeList.map((event) => event.id))
        .map((id) => byId.get(id))
        .filter((event): event is Event => !!event);

      return sorted.slice(0, 10);
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchEventsByCategory(category: EventCategory | string): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    // Parcourir les pages plutôt que filtrer seulement les 60 premiers événements :
    // une catégorie moins récente ne doit pas disparaître des résultats.
    const data = await selectPages<Event>((from, to) =>
      supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('starts_at', { ascending: true })
        .range(from, to)
    );
    const hydrated = data
      .map(hydrateEventCategories)
      .filter((event) => isRealEvent(event) && isEventActive(event) && !isEventTerminated(event));
    return hydrated.filter((event) => eventMatchesCategoryFilter(event, category));
  } catch {
    return [];
  }
}

export async function fetchTrendingEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .order('starts_at', { ascending: true })
      .limit(30);
    if (!error && data && data.length > 0) {
      const published = (data as Event[]).filter((e) => isRealEvent(e) && e.status === 'published' && !isEventTerminated(e));
      const rankedIds = await coreTrendIds(
        published.map((event) => ({
          id: event.id,
          likes: event.likes_count || 0,
          attendees: event.attendees_count || 0,
          views: event.views_count || 0,
          starts_at_ms: event.starts_at ? Date.parse(event.starts_at) : 0,
          terminated: false,
        }))
      );
      const byId = new Map(published.map((event) => [event.id, event]));
      const sorted = (rankedIds && rankedIds.length > 0 ? rankedIds : published.map((event) => event.id))
        .map((id) => byId.get(id))
        .filter((event): event is Event => !!event);
      return sorted.slice(0, 8);
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchUpcomingEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(50);
    if (!error && data && data.length > 0) {
      const published = (data as Event[]).filter((e) => isRealEvent(e) && e.status === 'published');
      const sorted = [...published].sort((a, b) => {
        const endedA = hasEventEnded(a);
        const endedB = hasEventEnded(b);
        if (endedA !== endedB) return endedA ? 1 : -1;
        const timeA = new Date(a.starts_at || 0).getTime();
        const timeB = new Date(b.starts_at || 0).getTime();
        return timeA - timeB;
      });
      return sorted.slice(0, 20);
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchEventById(id: string): Promise<EventWithRelations | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`*, event_artists ( artist:artists (*) ), organizer:organizations (*)`)
      .eq('id', id)
      .maybeSingle();

    if (!error && data && isRealEvent(data as Event)) {
      return data as EventWithRelations;
    }

    const { data: simpleData, error: simpleError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!simpleError && simpleData && isRealEvent(simpleData as Event)) {
      return {
        ...simpleData,
        event_artists: [],
        organizer: null,
      } as EventWithRelations;
    }

    return null;
  } catch {
    return null;
  }
}

export async function searchEvents(query: string): Promise<Event[]> {
  const sanitized = sanitizeSearchInput(query);
  if (!sanitized) return [];
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,location_name.ilike.%${sanitized}%,city.ilike.%${sanitized}%`)
      .order('starts_at', { ascending: true })
      .limit(40);
    if (error || !data) return [];
    return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e));
  } catch {
    return [];
  }
}

export async function fetchPastEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: false })
      .limit(30);
    if (!error && data && data.length > 0) {
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventTerminated(e));
    }
    return [];
  } catch {
    return [];
  }
}
