import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event, EventWithRelations, EventCategory } from '@/types';
import { hydrateEventCategories, eventMatchesCategoryFilter } from '@/constants/categories';
import { isRealEvent, isEventActive, isEventTerminated, hasEventEnded } from './status';
import { getLocalStoredTickets } from '@/features/tickets/service';
import { corePlatformStats, coreRankIds, coreTrendIds, type RustEvent, type RustTicket } from '@/lib/rust-core';

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

async function selectPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  // Au-delà de 1000 lignes Supabase tronque : les totaux étaient faux.
  for (let from = 0; from < 8000; from += pageSize) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const chunk = (data || []) as T[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const localTickets = getLocalStoredTickets();
  const countedTicketStatuses = new Set(['valid', 'used']);
  const localActiveTickets = localTickets.filter((t) =>
    countedTicketStatuses.has(String((t as { status?: string }).status || 'valid').toLowerCase())
  );
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
      categoryBasis: 'events',
      categoryShares: [],
      ticketsTimeline: [],
      eventsTimeline: [],
    };
  }

  try {
    const [rawEvents, artistsCount, orgsCount, rawTickets, platformAggregate] = await Promise.all([
      selectPages<Event>((from, to) =>
        supabase
          .from('events')
          .select('id, category, attendees_count, views_count, price_min, starts_at, ends_at, status, created_at')
          .eq('status', 'published')
          .range(from, to)
      ),
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      selectPages<{ id: string; price_paid?: number; status?: string; created_at?: string; event_id?: string }>((from, to) =>
        supabase
          .from('tickets')
          .select('id, price_paid, status, created_at, event_id')
          .range(from, to)
      ),
      supabase.functions.invoke('platform-stats'),
    ]);

    const events = rawEvents.filter(isRealEvent);
    const activeIds = new Set(events.filter((e) => isEventActive(e) && !isEventTerminated(e)).map((e) => e.id));
    if (platformAggregate.error) throw platformAggregate.error;
    const aggregateData = platformAggregate.data as { totalUsers?: number } | null;
    if (!aggregateData || typeof aggregateData.totalUsers !== 'number') {
      throw new Error('Global Auth user aggregate is unavailable');
    }
    // Compte Auth global côté serveur : inclut les comptes invités ou sans profil.
    const users = aggregateData.totalUsers;

    const rustTickets: RustTicket[] = [
      ...rawTickets.filter((ticket) =>
        countedTicketStatuses.has(String(ticket.status || 'valid').toLowerCase())
      ).map((ticket) => ({
        id: ticket.id,
        price_paid: Number(ticket.price_paid) || 0,
        status: ticket.status || 'valid',
        created_at_ms: ticket.created_at ? Date.parse(ticket.created_at) : 0,
        event_id: ticket.event_id || '',
        source: 'server' as const,
      })),
      ...localActiveTickets.map((ticket) => ({
        id: ticket.id,
        price_paid: Number(ticket.price_paid) || 0,
        status: ticket.status || 'valid',
        created_at_ms: ticket.created_at ? Date.parse(ticket.created_at) : 0,
        event_id: ticket.event_id || '',
        source: 'local' as const,
      })),
    ];

    const rustEvents: RustEvent[] = events.map((event) => ({
      id: event.id,
      category: event.category,
      attendees: event.attendees_count || 0,
      views: event.views_count || 0,
      likes: event.likes_count || 0,
      featured: !!event.is_featured,
      starts_at_ms: event.starts_at ? Date.parse(event.starts_at) : 0,
      active: activeIds.has(event.id),
    }));

    const core = await corePlatformStats({ tickets: rustTickets, events: rustEvents, users });

    // Repli TypeScript cohérent avec le moteur Rust lorsque le fichier WASM
    // n'est pas disponible : dédoublonner les billets et garder le serveur prioritaire.
    const mergedTickets = new Map<string, RustTicket>();
    for (const ticket of rustTickets) {
      if (!ticket.id) continue;
      const previous = mergedTickets.get(ticket.id);
      if (!previous || (previous.source !== 'server' && ticket.source === 'server')) {
        mergedTickets.set(ticket.id, ticket);
      }
    }
    const confirmedTickets = Array.from(mergedTickets.values()).filter((ticket) =>
      countedTicketStatuses.has(String(ticket.status || 'valid').toLowerCase())
    );
    const fallbackRevenue = Math.round(
      confirmedTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.price_paid || 0), 0)
    );

    const categoryByEvent = new Map(events.map((event) => [event.id, event.category || '']));
    const revenueByCategory = new Map<string, { count: number; amount: number }>();
    for (const ticket of confirmedTickets) {
      const category = categoryByEvent.get(ticket.event_id);
      if (!category) continue;
      const current = revenueByCategory.get(category) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Math.max(0, ticket.price_paid || 0);
      revenueByCategory.set(category, current);
    }

    const useRevenueBasis = Array.from(revenueByCategory.values()).some((value) => value.amount > 0);
    const fallbackCategoryBasis: PlatformStats['categoryBasis'] = useRevenueBasis ? 'revenue' : 'events';
    const categoryTotals = useRevenueBasis
      ? Array.from(revenueByCategory.entries())
          .filter(([, value]) => value.amount > 0)
          .map(([id, value]) => ({ id, count: value.count, amount: value.amount }))
      : Array.from(events.reduce((counts, event) => {
          if (activeIds.has(event.id) && event.category) {
            counts.set(event.category, (counts.get(event.category) || 0) + 1);
          }
          return counts;
        }, new Map<string, number>()).entries())
          .map(([id, count]) => ({ id, count, amount: 0 }));

    categoryTotals.sort((a, b) =>
      (useRevenueBasis ? b.amount - a.amount : b.count - a.count) || b.count - a.count
    );
    const totalCategoryWeight = categoryTotals.reduce(
      (sum, item) => sum + (useRevenueBasis ? item.amount : item.count),
      0
    );
    const categoryShares = categoryTotals.map((item) => {
      const weight = useRevenueBasis ? item.amount : item.count;
      const exact = totalCategoryWeight > 0 ? (weight / totalCategoryWeight) * 100 : 0;
      return { ...item, percent: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    const remainingPercent = 100 - categoryShares.reduce((sum, item) => sum + item.percent, 0);
    const remainderOrder = [...categoryShares].sort((a, b) => b.remainder - a.remainder);
    for (let index = 0; index < remainingPercent && index < remainderOrder.length; index++) {
      remainderOrder[index].percent += 1;
    }
    const fallbackCategoryShares = categoryShares.map((item) => ({
      id: item.id,
      count: item.count,
      amount: item.amount,
      percent: item.percent,
    }));

    const categories: Record<string, number> = {};
    const resolvedCategoryShares = core?.category_shares ?? fallbackCategoryShares;
    for (const share of resolvedCategoryShares) {
      categories[share.id] = share.count;
    }

    const ticketsTimeline = (core?.timeline
      ? core.timeline.map((ticket, index) => ({
          // Le moteur Rust renvoie les billets sans leur identifiant : l'index garantit
          // une clé distincte même si plusieurs achats partagent la même milliseconde.
          id: `${ticket.event_id}-${ticket.created_at_ms}-${index}`,
          created_at: new Date(ticket.created_at_ms).toISOString(),
          created_at_ms: ticket.created_at_ms,
          price_paid: ticket.price_paid,
          event_id: ticket.event_id,
        }))
      : confirmedTickets
          .filter((ticket) => ticket.created_at_ms > 0)
          .map((ticket) => ({
            id: ticket.id,
            created_at: new Date(ticket.created_at_ms).toISOString(),
            created_at_ms: ticket.created_at_ms,
            price_paid: ticket.price_paid || 0,
            event_id: ticket.event_id,
          })));
    const eventsTimeline = events
      .filter((event) => activeIds.has(event.id))
      .map((event) => ({
        id: event.id,
        starts_at_ms: event.starts_at ? Date.parse(event.starts_at) : 0,
        attendees: event.attendees_count || 0,
      }));

    return {
      totalEvents: core?.total_events ?? activeIds.size,
      totalArtists: artistsCount.count ?? 0,
      totalOrganizers: orgsCount.count ?? 0,
      totalTickets: core?.total_tickets ?? confirmedTickets.length,
      totalParticipants: users,
      totalUsers: users,
      totalViews: core?.total_views ?? events.reduce((sum, event) => sum + Math.max(0, event.views_count || 0), 0),
      totalRevenue: core?.total_revenue ?? fallbackRevenue,
      categories,
      categoryBasis: core?.category_basis ?? fallbackCategoryBasis,
      categoryShares: resolvedCategoryShares,
      ticketsTimeline,
      eventsTimeline,
      isAvailable: true,
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
      categoryBasis: 'events',
      categoryShares: [],
      ticketsTimeline: [],
      eventsTimeline: [],
      isAvailable: false,
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
