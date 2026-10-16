import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated, hasEventEnded } from './status';
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
  ticketsTimeline?: Array<{
    created_at: string;
    price_paid: number;
    event_id: string;
  }>;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const localTickets = getLocalStoredTickets();
  const localActiveTickets = localTickets.filter((t) => (t as { status?: string }).status !== 'cancelled');
  const localTicketCount = localActiveTickets.length;
  const localRevenue = localActiveTickets.reduce((sum, t) => sum + (Number((t as { price_paid?: number }).price_paid) || 0), 0);

  const baselineTickets = localTicketCount;
  const baselineRevenue = localRevenue;

  if (!isSupabaseConfigured) {
    return {
      totalEvents: 0,
      totalArtists: 0,
      totalOrganizers: 0,
      totalTickets: baselineTickets,
      totalParticipants: 0,
      totalUsers: 0,
      totalViews: 0,
      totalRevenue: baselineRevenue,
      categories: {},
      ticketsTimeline: [],
    };
  }

  try {
    const [eventsRes, artistsCount, orgsCount, ticketsRes, profilesRes] = await Promise.all([
      supabase.from('events').select('id, category, attendees_count, views_count, price_min, starts_at, ends_at, status, created_at').eq('status', 'published'),
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id, price_paid, status, created_at, event_id').neq('status', 'cancelled'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const rawEvents = (eventsRes.data || []) as Event[];
    const events = rawEvents.filter(isRealEvent);
    const activeEvents = events.filter((e) => isEventActive(e) && !isEventTerminated(e));
    const tickets = (ticketsRes.data || []) as Array<{ id: string; price_paid?: number; status?: string; created_at?: string; event_id?: string }>;

    const totalEvents = activeEvents.length;
    const totalArtists = artistsCount.count ?? 0;
    const totalOrganizers = orgsCount.count ?? 0;

    const dbTicketCount = tickets.length;
    const dbRevenue = tickets.reduce((sum: number, t) => sum + (Number(t.price_paid) || 0), 0);

    const totalTickets = dbTicketCount + localTicketCount;
    const totalRevenue = dbRevenue + localRevenue;

    const totalUsers = profilesRes.count ?? 0;
    const totalViews = events.reduce((sum: number, e: { views_count?: number }) => sum + (e.views_count || 0), 0);

    // Vrai total des participants ayant un billet ou inscrits
    const totalParticipants = Math.max(
      totalTickets,
      events.reduce((sum, e) => sum + (e.attendees_count || 0), 0),
      totalUsers
    );

    const categories: Record<string, number> = {};
    for (const e of events) {
      if (e.category) {
        categories[e.category] = (categories[e.category] || 0) + 1;
      }
    }

    const ticketsTimeline = tickets.map((t) => ({
      created_at: t.created_at || new Date().toISOString(),
      price_paid: Number(t.price_paid) || 0,
      event_id: t.event_id || '',
    }));

    return {
      totalEvents,
      totalArtists,
      totalOrganizers,
      totalTickets,
      totalParticipants,
      totalUsers,
      totalViews,
      totalRevenue,
      categories,
      ticketsTimeline,
    };
  } catch {
    return {
      totalEvents: 0,
      totalArtists: 0,
      totalOrganizers: 0,
      totalTickets: baselineTickets,
      totalParticipants: 0,
      totalUsers: 0,
      totalViews: 0,
      totalRevenue: baselineRevenue,
      categories: {},
      ticketsTimeline: [],
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
      .limit(50);

    if (!error && data && data.length > 0) {
      // La section "À la une" doit EXCLUSIVEMENT afficher des événements actifs (non terminés)
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
      const published = (data as Event[]).filter((e) => isRealEvent(e) && e.status === 'published');
      const sorted = [...published].sort((a, b) => {
        const endedA = hasEventEnded(a);
        const endedB = hasEventEnded(b);
        if (endedA !== endedB) return endedA ? 1 : -1;
        return (b.views_count || 0) - (a.views_count || 0);
      });
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
