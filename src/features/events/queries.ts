import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated, hasEventEnded, isRealProfile, isRealArtist, isRealOrganization } from './status';
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

  if (!isSupabaseConfigured) return unavailable;

  try {
    // Priorité au endpoint serveur même origine propulsé par Rust WebAssembly
    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/api/platform-stats', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (res.ok) {
          const apiData = (await res.json()) as Partial<PlatformStats>;
          if (apiData && typeof apiData.totalUsers === 'number' && typeof apiData.totalTickets === 'number') {
            return {
              ...unavailable,
              ...apiData,
              isAvailable: true,
            } as PlatformStats;
          }
        }
      } catch {
        // Repli sur l'edge function Supabase si /api/platform-stats est indisponible
      }
    }

    // Repli sur l'agrégation directe via les tables publiques si /api/platform-stats est indisponible
    const [eventsRes, optionsRes, artistsRes, orgsRes, profilesRes] = await Promise.all([
      supabase.from('events').select('id, category, attendees_count, views_count, starts_at, ends_at, status').limit(500),
      supabase.from('ticket_options').select('id, event_id, price, quantity_sold').limit(1000),
      supabase.from('artists').select('id, name').limit(500),
      supabase.from('organizations').select('id, name').limit(500),
      supabase.from('profiles').select('id, name, email, role').limit(1000),
    ]);

    if (eventsRes.error) return unavailable;

    const events = (Array.isArray(eventsRes.data) ? eventsRes.data : []).filter(
      (ev) => isRealEvent(ev) && !String(ev.id).toLowerCase().startsWith('e1000000-')
    );
    const realEventIds = new Set(events.map((ev) => ev.id));
    const options = (Array.isArray(optionsRes.data) ? optionsRes.data : []).filter((o) =>
      realEventIds.has(o.event_id)
    );
    const artists = (Array.isArray(artistsRes.data) ? artistsRes.data : []).filter(isRealArtist);
    const orgs = (Array.isArray(orgsRes.data) ? orgsRes.data : []).filter(isRealOrganization);
    const profiles = (Array.isArray(profilesRes.data) ? profilesRes.data : []).filter(isRealProfile);
    const nonParticipantRoles = new Set(['organizer', 'artist', 'admin']);
    const participantAccounts = profiles.filter(
      (p) => !nonParticipantRoles.has(String(p.role || 'participant').toLowerCase())
    ).length;

    const activeEvents = events.filter((ev) => isEventActive(ev as Event));
    const attendanceEvents = events.filter((ev) => ['published', 'completed'].includes(ev.status));
    const categories: Record<string, number> = {};
    for (const ev of activeEvents) {
      const cat = String(ev.category || 'other');
      categories[cat] = (categories[cat] || 0) + 1;
    }

    const totalTickets = options.reduce((sum, opt) => sum + Math.max(0, Number(opt.quantity_sold) || 0), 0);
    const totalRevenue = Math.round(
      options.reduce(
        (sum, opt) => sum + Math.max(0, Number(opt.quantity_sold) || 0) * Math.max(0, Number(opt.price) || 0),
        0
      )
    );
    const totalActiveCount = activeEvents.length;
    const categoryShares = Object.entries(categories)
      .map(([id, count]) => ({
        id,
        count,
        amount: 0,
        percent: totalActiveCount > 0 ? Math.round((count / totalActiveCount) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    return {
      ...unavailable,
      totalEvents: activeEvents.length,
      totalAllEvents: events.length,
      totalArtists: artists.length,
      totalOrganizers: orgs.length,
      totalTickets,
      totalRevenue,
      totalUsers: profiles.length,
      totalProfiles: profiles.length,
      totalParticipantAccounts: participantAccounts,
      totalParticipants: attendanceEvents.reduce((sum, ev) => sum + Math.max(0, Number(ev.attendees_count) || 0), 0),
      totalViews: events.reduce((sum, ev) => sum + Math.max(0, Number(ev.views_count) || 0), 0),
      categories,
      categoryBasis: 'events',
      categoryShares,
      eventsTimeline: attendanceEvents.map((ev) => ({
        id: ev.id,
        starts_at_ms: ev.starts_at ? Date.parse(ev.starts_at) || 0 : 0,
        attendees: Math.max(0, Number(ev.attendees_count) || 0),
      })),
      isAvailable: true,
    };
  } catch {
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
