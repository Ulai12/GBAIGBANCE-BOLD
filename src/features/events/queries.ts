import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated, hasEventEnded } from './status';
import { coreRankIds, coreTrendIds } from '@/lib/rust-core';

function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// ==================== STATS ====================

export interface PlatformStats {
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
    event_id: string;
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

  if (!isSupabaseConfigured || typeof fetch !== 'function') return unavailable;

  try {
    // Source unique : l'API serveur agrège les vraies lignes Supabase (tickets, events,
    // profils et inventaire). Ne pas basculer vers l'ancien RPC SQL qui renvoie des
    // montants nuls et ne reflète pas les ventes multi-quantités.
    const response = await fetch('/api/platform-stats', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return unavailable;

    const data = (await response.json()) as Partial<PlatformStats>;
    if (
      !data ||
      data.isAvailable !== true ||
      typeof data.totalUsers !== 'number' ||
      typeof data.totalTickets !== 'number' ||
      typeof data.totalEvents !== 'number' ||
      typeof data.totalRevenue !== 'number' ||
      !Array.isArray(data.categoryShares) ||
      !Array.isArray(data.ticketsTimeline) ||
      !Array.isArray(data.eventsTimeline)
    ) {
      return unavailable;
    }

    return { ...unavailable, ...data, isAvailable: true } as PlatformStats;
  } catch {
    // En cas d'indisponibilité réelle, afficher l'état indisponible plutôt que des chiffres inventés.
    return unavailable;
  }
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
