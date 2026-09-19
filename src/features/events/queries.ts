import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated } from './status';
import { getLocalStoredTickets } from '@/features/tickets/service';

function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// ==================== STATS ====================

export interface PlatformStats {
  totalEvents: number;
  totalArtists: number;
  totalOrganizers: number;
  totalTickets: number;
  totalParticipants: number;
  totalUsers: number;
  totalViews: number;
  totalRevenue: number;
  categories: Record<string, number>;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const localTickets = getLocalStoredTickets();
  const localActiveTickets = localTickets.filter((t) => (t as { status?: string }).status !== 'cancelled');
  const localTicketCount = localActiveTickets.reduce((sum, t) => sum + (Number((t as { quantity?: number }).quantity) || 1), 0);
  const localRevenue = localActiveTickets.reduce((sum, t) => sum + (Number((t as { price_paid?: number }).price_paid) || 0), 0);

  const baselineTickets = localTicketCount;
  const baselineRevenue = localRevenue;

  if (!isSupabaseConfigured) {
    return {
      totalEvents: 0,
      totalArtists: 0,
      totalOrganizers: 0,
      totalTickets: baselineTickets,
      totalParticipants: 4,
      totalUsers: 4,
      totalViews: 0,
      totalRevenue: baselineRevenue,
      categories: {},
    };
  }

  try {
    const [eventsRes, artistsCount, orgsCount, ticketsRes, profilesRes] = await Promise.all([
      supabase.from('events').select('id, category, attendees_count, views_count, price_min, starts_at, ends_at, status').eq('status', 'published'),
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id, price_paid, quantity, status').neq('status', 'cancelled'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const rawEvents = (eventsRes.data || []) as Event[];
    const events = rawEvents.filter(isRealEvent);
    const activeEvents = events.filter((e) => isEventActive(e) && !isEventTerminated(e));
    const tickets = ticketsRes.data || [];

    const totalEvents = activeEvents.length;
    const totalArtists = artistsCount.count ?? 0;
    const totalOrganizers = orgsCount.count ?? 0;

    const dbTicketCount = tickets.reduce((sum: number, t: { quantity?: number }) => sum + (t.quantity || 1), 0);
    const dbRevenue = tickets.reduce((sum: number, t: { price_paid?: number }) => sum + (t.price_paid || 0), 0);

    const totalTickets = dbTicketCount + localTicketCount;
    const totalRevenue = dbRevenue + localRevenue;

    const totalUsers = Math.max(profilesRes.count ?? 0, 1);
    const totalViews = events.reduce((sum: number, e: { views_count?: number }) => sum + (e.views_count || 0), 0);

    const categories: Record<string, number> = {};
    for (const e of activeEvents) {
      if (e.category) {
        categories[e.category] = (categories[e.category] || 0) + 1;
      }
    }

    return {
      totalEvents,
      totalArtists,
      totalOrganizers,
      totalTickets,
      totalParticipants: totalUsers,
      totalUsers,
      totalViews,
      totalRevenue,
      categories,
    };
  } catch {
    return {
      totalEvents: 0,
      totalArtists: 0,
      totalOrganizers: 0,
      totalTickets: baselineTickets,
      totalParticipants: 4,
      totalUsers: 4,
      totalViews: 0,
      totalRevenue: baselineRevenue,
      categories: {},
    };
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
      .limit(40);

    if (!error && data && data.length > 0) {
      const activeList = (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e));

      const sorted = [...activeList].sort((a, b) => {
        const scoreA =
          (a.is_featured ? 500 : 0) +
          (a.attendees_count || 0) * 4 +
          (a.views_count || 0) * 1.5 +
          (a.likes_count || 0) * 3;
        const scoreB =
          (b.is_featured ? 500 : 0) +
          (b.attendees_count || 0) * 4 +
          (b.views_count || 0) * 1.5 +
          (b.likes_count || 0) * 3;
        return scoreB - scoreA;
      });

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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(60);
    if (!error && data && data.length > 0) {
      const hydrated = (data as Event[])
        .map(hydrateEventCategories)
        .filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e));
      return hydrated.filter((e) => eventMatchesCategoryFilter(e, category));
    }
    return [];
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
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e)).slice(0, 8);
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
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e) && !isEventTerminated(e)).slice(0, 20);
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
