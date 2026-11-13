import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Event, Organization } from '@/types';
import { isRealEvent, isRealOrganization, isEventActive } from '@/features/events/status';
import { coreOrganizerSeries, corePlatformStats, type RustTicket } from '@/lib/rust-core';

export interface PerformanceTimePoint {
  date: string;
  label: string;
  ticketsSold: number;
  revenue: number;
  cumulativeTickets: number;
  cumulativeRevenue: number;
}

export interface TicketTypeBreakdown {
  name: string;
  count: number;
  revenue: number;
  color: string;
}

export interface OrganizerPerformanceData {
  timeSeries: PerformanceTimePoint[];
  categoryBreakdown: TicketTypeBreakdown[];
  summary: {
    totalTickets: number;
    totalRevenue: number;
    totalViews: number;
    conversionRate: number;
    averageTicketPrice: number;
    activeEvents: number;
    totalEvents: number;
  };
}

const COUNTED_TICKET_STATUSES = new Set(['active', 'valid', 'used']);

async function fetchTicketsForEvents(eventIds: string[]) {
  const rows: Array<{
    id: string;
    event_id: string;
    ticket_type: string;
    price_paid?: number;
    status?: string;
    created_at: string;
  }> = [];
  if (!isSupabaseConfigured || eventIds.length === 0) return rows;
  const pageSize = 1000;
  for (let i = 0; i < eventIds.length; i += 80) {
    const slice = eventIds.slice(i, i + 80);
    for (let from = 0; from < 8000; from += pageSize) {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, event_id, ticket_type, price_paid, status, created_at')
        .in('event_id', slice)
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      rows.push(...(data as typeof rows));
      if (data.length < pageSize) break;
    }
  }
  return rows;
}

function toRustTickets(tickets: Array<{
  id: string;
  event_id: string;
  ticket_type?: string;
  price_paid?: number;
  status?: string;
  created_at?: string;
}>): RustTicket[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    price_paid: Number(ticket.price_paid) || 0,
    status: ticket.status || 'valid',
    created_at_ms: ticket.created_at ? Date.parse(ticket.created_at) : 0,
    event_id: ticket.event_id,
    ticket_type: ticket.ticket_type,
    source: 'server' as const,
  }));
}

export async function fetchOrganizationById(id: string): Promise<Organization | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const [realFollowersRes, realEventsRes] = await Promise.all([
      supabase.from('organization_follows').select('id', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('events').select('id', { count: 'exact', head: true }).or(`organizer_id.eq.${id},organizer_user_id.eq.${id}`).eq('status', 'published'),
    ]);

    const realFollowersCount = typeof realFollowersRes.count === 'number' ? realFollowersRes.count : 0;
    const realEventsCount = typeof realEventsRes.count === 'number' ? realEventsRes.count : 0;

    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
    if (!error && data && isRealOrganization(data as Organization)) {
      const org = data as Organization;
      return {
        ...org,
        followers_count: realFollowersCount || (org.followers_count || 0),
        events_count: realEventsCount || (org.events_count || 0),
      };
    }

    // Check in profiles if organization was registered as user profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (p && p.role === 'organizer') {
      return {
        id: p.id,
        owner_id: p.id,
        name: p.name,
        description: p.bio || 'Organisateur et créateur d’événements sur Gbaigbance',
        logo_url: p.avatar_url || null,
        cover_url: '',
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        verification_status: 'verified' as const,
        followers_count: realFollowersCount,
        events_count: realEventsCount,
        created_at: p.created_at || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchEventsByOrganization(orgId: string): Promise<Event[]> {
  if (!isSupabaseConfigured || !orgId) return [];
  try {
    const [byOrg, byUser] = await Promise.all([
      supabase.from('events').select('*').eq('organizer_id', orgId).eq('status', 'published').order('starts_at', { ascending: false }),
      supabase.from('events').select('*').eq('organizer_user_id', orgId).eq('status', 'published').order('starts_at', { ascending: false }),
    ]);

    const combined = [
      ...(((byOrg.data as Event[]) || [])),
      ...(((byUser.data as Event[]) || [])),
    ];
    const map = new Map<string, Event>();
    combined.forEach((e) => {
      if (e && e.id && isRealEvent(e)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export async function isFollowingOrganization(orgId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_follows')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function fetchOrganizerPerformanceMetrics(
  userId: string,
  timeRange: '7d' | '30d' | 'all' = '7d'
): Promise<OrganizerPerformanceData> {
  const emptyResult: OrganizerPerformanceData = {
    timeSeries: [],
    categoryBreakdown: [],
    summary: {
      totalTickets: 0,
      totalRevenue: 0,
      totalViews: 0,
      conversionRate: 0,
      averageTicketPrice: 0,
      activeEvents: 0,
      totalEvents: 0,
    },
  };

  if (!userId) return emptyResult;

  try {
    // 1. Fetch user's events
    const { data: rawEvents } = await supabase
      .from('events')
      .select('id, title, views_count, attendees_count, status, created_at, starts_at')
      .eq('organizer_user_id', userId);

    const events = ((rawEvents || []) as Event[]).filter(isRealEvent);
    const eventIds = events.map((e) => e.id);

    const totalViews = events.reduce((s, e) => s + (e.views_count || 0), 0);
    const activeEvents = events.filter((e) => e.status === 'published' && isEventActive(e)).length;

    // 2. Billets serveur (au-delà de 1000) + cache local. Rust retire les annulations.
    let tickets: Array<{
      id: string;
      event_id: string;
      ticket_type: string;
      quantity?: number;
      price_paid?: number;
      status?: string;
      created_at: string;
    }> = [];

    if (eventIds.length > 0) {
      const dbTickets = await fetchTicketsForEvents(eventIds);
      tickets = dbTickets.map((t) => ({ ...t, quantity: 1 }));
    }

    // Les métriques organisateur reposent sur les billets persistés côté serveur.
    // Le cache du navigateur ne constitue pas une source de vérité et ne doit pas
    // gonfler ou diverger les ventes affichées sur plusieurs appareils.

    const daysCount = timeRange === '7d' ? 7 : 30;
    const countedTickets = tickets.filter((ticket) =>
      COUNTED_TICKET_STATUSES.has((ticket.status || 'valid').toLowerCase())
    );
    const rustTickets = toRustTickets(countedTickets);
    // « Tout » doit couvrir tout l'historique disponible, pas une fenêtre arbitraire de 60 jours.
    const series = timeRange === 'all' ? null : await coreOrganizerSeries(daysCount, rustTickets);

    const categoryColors: Record<string, string> = {
      standard: '#6600FF',
      vip: '#A855F7',
      vvip: '#EC4899',
      free: '#10B981',
    };
    const categoryLabels: Record<string, string> = {
      standard: 'Standard',
      vip: 'VIP',
      vvip: 'VVIP',
      free: 'Gratuit',
    };

    const timeSeries: PerformanceTimePoint[] = timeRange === 'all'
      ? allTimeMonthlySeries(rustTickets)
      : series
        ? series.points.map((point) => ({
            date: `${point.year}-${String(point.month).padStart(2, '0')}-${String(point.day).padStart(2, '0')}`,
            label: new Date(point.year, point.month - 1, point.day).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: daysCount > 14 ? 'numeric' : 'short',
            }),
            ticketsSold: point.tickets_sold,
            revenue: point.revenue,
            cumulativeTickets: point.cumulative_tickets,
            cumulativeRevenue: point.cumulative_revenue,
          }))
        : fallbackSeries(daysCount, rustTickets);

    const counted = series ? null : tallyTickets(rustTickets);
    const totalTickets = series?.tickets ?? counted?.tickets ?? 0;
    const totalRevenue = series?.revenue ?? counted?.revenue ?? 0;
    const categoryBreakdown: TicketTypeBreakdown[] = (series?.by_type || fallbackByType(rustTickets))
      .map((entry) => ({
        name: categoryLabels[entry.key] || entry.key.toUpperCase(),
        count: entry.count,
        revenue: entry.revenue,
        color: categoryColors[entry.key] || '#6600FF',
      }));

    const conversionRate = totalViews > 0 ? (totalTickets / totalViews) * 100 : 0;
    const averageTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    return {
      timeSeries,
      categoryBreakdown,
      summary: {
        totalTickets,
        totalRevenue,
        totalViews,
        conversionRate,
        averageTicketPrice: Math.round(averageTicketPrice),
        activeEvents,
        totalEvents: events.length,
      },
    };
  } catch (error) {
    console.error('Error fetching organizer performance metrics:', error);
    return emptyResult;
  }
}

function keptTickets(tickets: RustTicket[]): RustTicket[] {
  const map = new Map<string, RustTicket>();
  for (const ticket of tickets) {
    if (!ticket.id) continue;
    const prev = map.get(ticket.id);
    if (!prev || (prev.source !== 'server' && ticket.source === 'server')) map.set(ticket.id, ticket);
  }
  return [...map.values()].filter((ticket) =>
    COUNTED_TICKET_STATUSES.has((ticket.status || 'valid').toLowerCase())
  );
}

function tallyTickets(tickets: RustTicket[]): { tickets: number; revenue: number } {
  const kept = keptTickets(tickets);
  return {
    tickets: kept.length,
    revenue: Math.round(kept.reduce((sum, ticket) => sum + Math.max(0, ticket.price_paid || 0), 0)),
  };
}

function fallbackByType(tickets: RustTicket[]): Array<{ key: string; count: number; revenue: number }> {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const ticket of keptTickets(tickets)) {
    const key = (ticket.ticket_type || 'standard').toLowerCase() || 'standard';
    const entry = map.get(key) || { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Math.max(0, ticket.price_paid || 0);
    map.set(key, entry);
  }
  return [...map.entries()].map(([key, entry]) => ({ key, count: entry.count, revenue: Math.round(entry.revenue) }));
}

function fallbackSeries(days: number, tickets: RustTicket[]): PerformanceTimePoint[] {
  const kept = keptTickets(tickets);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, tickets: 0, revenue: 0 };
  });
  let total = 0;
  let revenue = 0;
  let windowTickets = 0;
  let windowRevenue = 0;
  for (const ticket of kept) {
    const price = Math.max(0, ticket.price_paid || 0);
    total += 1;
    revenue += price;
    if (!ticket.created_at_ms) continue;
    const created = new Date(ticket.created_at_ms);
    const day = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const index = Math.round((day.getTime() - start.getTime()) / 86_400_000);
    if (index >= 0 && index < points.length) {
      points[index].tickets += 1;
      points[index].revenue += price;
      windowTickets += 1;
      windowRevenue += price;
    }
  }
  let cumulativeTickets = total - windowTickets;
  let cumulativeRevenue = revenue - windowRevenue;
  return points.map((point) => {
    cumulativeTickets += point.tickets;
    cumulativeRevenue += point.revenue;
    const y = point.date.getFullYear();
    const m = String(point.date.getMonth() + 1).padStart(2, '0');
    const d = String(point.date.getDate()).padStart(2, '0');
    return {
      date: `${y}-${m}-${d}`,
      label: point.date.toLocaleDateString('fr-FR', { day: 'numeric', month: days > 14 ? 'numeric' : 'short' }),
      ticketsSold: point.tickets,
      revenue: Math.round(point.revenue),
      cumulativeTickets,
      cumulativeRevenue: Math.round(cumulativeRevenue),
    };
  });
}

function allTimeMonthlySeries(tickets: RustTicket[]): PerformanceTimePoint[] {
  const kept = keptTickets(tickets).filter((ticket) =>
    ticket.created_at_ms > 0 && ticket.created_at_ms <= Date.now()
  );
  if (kept.length === 0) return [];

  const earliestTimestamp = kept.reduce(
    (earliest, ticket) => Math.min(earliest, ticket.created_at_ms),
    Number.POSITIVE_INFINITY
  );
  const firstTicketDate = new Date(earliestTimestamp);
  const now = new Date();
  const firstMonth = new Date(firstTicketDate.getFullYear(), firstTicketDate.getMonth(), 1);
  const monthCount =
    (now.getFullYear() - firstMonth.getFullYear()) * 12 +
    now.getMonth() - firstMonth.getMonth() + 1;

  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    return { date, tickets: 0, revenue: 0 };
  });

  for (const ticket of kept) {
    const date = new Date(ticket.created_at_ms);
    const index =
      (date.getFullYear() - firstMonth.getFullYear()) * 12 +
      date.getMonth() - firstMonth.getMonth();
    if (index < 0 || index >= months.length) continue;
    months[index].tickets += 1;
    months[index].revenue += Math.max(0, ticket.price_paid || 0);
  }

  let cumulativeTickets = 0;
  let cumulativeRevenue = 0;
  return months.map((month) => {
    cumulativeTickets += month.tickets;
    cumulativeRevenue += month.revenue;
    const year = month.date.getFullYear();
    const monthNumber = String(month.date.getMonth() + 1).padStart(2, '0');
    return {
      date: `${year}-${monthNumber}-01`,
      label: month.date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      ticketsSold: month.tickets,
      revenue: Math.round(month.revenue),
      cumulativeTickets,
      cumulativeRevenue: Math.round(cumulativeRevenue),
    };
  });
}
function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export async function fetchVerifiedOrganizations(): Promise<Organization[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const [orgsRes, profilesRes, eventsRes, followsRes] = await Promise.all([
      supabase.from('organizations').select('*').limit(30),
      supabase.from('profiles').select('*').eq('role', 'organizer').limit(30),
      supabase.from('events').select('id, organizer_id, organizer_user_id, status').eq('status', 'published'),
      supabase.from('organization_follows').select('organization_id'),
    ]);

    const eventsList = (eventsRes.data || []) as { organizer_id?: string; organizer_user_id?: string }[];
    const eventCountByOrg: Record<string, number> = {};
    const eventCountByUser: Record<string, number> = {};
    eventsList.forEach((e) => {
      if (e.organizer_id) {
        eventCountByOrg[e.organizer_id] = (eventCountByOrg[e.organizer_id] || 0) + 1;
      }
      if (e.organizer_user_id) {
        eventCountByUser[e.organizer_user_id] = (eventCountByUser[e.organizer_user_id] || 0) + 1;
      }
    });

    const followList = (followsRes.data || []) as { organization_id: string }[];
    const followersMap: Record<string, number> = {};
    followList.forEach((f) => {
      if (f.organization_id) {
        followersMap[f.organization_id] = (followersMap[f.organization_id] || 0) + 1;
      }
    });

    const orgs = ((orgsRes.data || []) as Organization[])
      // Exclut les organisations fantômes ou de démo sans propriétaire réel
      .filter((o) => isRealOrganization(o) && Boolean(o.owner_id))
      .map((o) => ({
        ...o,
        followers_count: followersMap[o.id] || (o.owner_id ? followersMap[o.owner_id] : 0) || (o.followers_count || 0),
        events_count: eventCountByOrg[o.id] || (o.owner_id ? eventCountByUser[o.owner_id] : 0) || 0,
      }));

    const knownIds = new Set(orgs.map((o) => o.id).concat(orgs.map((o) => o.owner_id || '').filter(Boolean)));
    const knownNames = new Set(orgs.map((o) => (o.name || '').toLowerCase().trim()));

    const profileOrgs: Organization[] = ((profilesRes.data || []) as Array<{ id: string; name: string; bio?: string | null; avatar_url?: string | null; city?: string | null; country?: string | null; created_at?: string }>)
      .filter((p) => p.name && !knownIds.has(p.id) && !knownNames.has(p.name.toLowerCase().trim()))
      .map((p) => ({
        id: p.id,
        owner_id: p.id,
        name: p.name,
        description: p.bio || 'Organisateur et créateur d’expériences sur Gbaigbance',
        logo_url: p.avatar_url || null,
        cover_url: '',
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        verification_status: 'verified' as const,
        followers_count: followersMap[p.id] || 0,
        events_count: eventCountByUser[p.id] || 0,
        created_at: p.created_at || new Date().toISOString(),
      }))
      .filter(isRealOrganization);

    return [...orgs, ...profileOrgs].filter(isRealOrganization);
  } catch {
    return [];
  }
}

export async function fetchOrganizerStats(userId: string): Promise<{ totalEvents: number; totalAttendees: number; totalViews: number; totalLikes: number; totalTickets: number; totalRevenue: number; activeEvents: number }> {
  const defaultStats = {
    totalEvents: 0,
    totalAttendees: 0,
    totalViews: 0,
    totalLikes: 0,
    totalTickets: 0,
    totalRevenue: 0,
    activeEvents: 0,
  };
  if (!isSupabaseConfigured || !userId) return defaultStats;
  try {
    const { data: rawEvents } = await supabase.from('events').select('*').eq('organizer_user_id', userId);
    const events = ((rawEvents || []) as Event[]).filter(isRealEvent);
    const eventIds = events.map((e) => e.id);
    const baseStats = {
      totalEvents: events.length,
      totalAttendees: events.reduce((s, e) => s + (e.attendees_count || 0), 0),
      totalViews: events.reduce((s, e) => s + (e.views_count || 0), 0),
      totalLikes: events.reduce((s, e) => s + (e.likes_count || 0), 0),
      activeEvents: events.filter((e) => e.status === 'published' && isEventActive(e)).length,
      totalTickets: 0,
      totalRevenue: 0,
    };
    if (eventIds.length === 0) return baseStats;
    const rows = await fetchTicketsForEvents(eventIds);
    const local = getLocalStoredTickets().filter((ticket) => eventIds.includes(ticket.event_id || '') && !rows.some((row) => row.id === ticket.id));
    const rustTickets = toRustTickets([
      ...rows,
      ...local.map((ticket) => ({
        id: ticket.id,
        event_id: ticket.event_id || '',
        ticket_type: ticket.ticket_type || 'standard',
        price_paid: ticket.price_paid,
        status: ticket.status,
        created_at: ticket.created_at,
      })),
    ]);
    const core = await corePlatformStats({ tickets: rustTickets, events: [], users: 0 });
    const fallback = core ? null : tallyTickets(rustTickets);
    baseStats.totalTickets = core?.total_tickets ?? fallback?.tickets ?? 0;
    baseStats.totalRevenue = core?.total_revenue ?? fallback?.revenue ?? 0;
    return baseStats;
  } catch {
    return defaultStats;
  }
}

export async function searchOrganizations(query: string): Promise<Organization[]> {
  const sanitized = sanitizeSearchInput(query);
  if (!sanitized) return [];
  const { data: seedOrgs, error: err1 } = await supabase
    .from('organizations')
    .select('*')
    .or(`name.ilike.%${sanitized}%,city.ilike.%${sanitized}%`)
    .limit(20);
  if (err1) throw err1;
  const { data: profileOrgs, error: err2 } = await supabase
    .from('profiles')
    .select('id, name, bio, avatar_url, city, country, created_at')
    .eq('role', 'organizer')
    .ilike('name', `%${sanitized}%`)
    .limit(20);
  if (err2) throw err2;
  const fromProfiles = (profileOrgs || []).map((p: { id: string; name: string; bio?: string | null; avatar_url?: string | null; city?: string | null; country?: string | null; created_at?: string }) => ({
    id: p.id || '', owner_id: p.id || '', name: p.name || '', description: p.bio || null, logo_url: p.avatar_url || null, cover_url: null,
    website: null, phone: null, email: null, city: p.city || 'Lomé', country: p.country || 'TG',
    verification_status: 'pending' as const, followers_count: 0, events_count: 0, created_at: p.created_at || new Date().toISOString(),
  })) as Organization[];
  const seen = new Set<string>();
  const merged = [...(seedOrgs || []).filter((o) => Boolean(o.owner_id)), ...fromProfiles]
    .filter(isRealOrganization)
    .filter((o) => {
      // Pour une collaboration ou association, une organisation doit obligatoirement être rattachée à un utilisateur propriétaire
      if (!o.owner_id) return false;
      const key = o.owner_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return merged as Organization[];
}

export async function toggleOrganizationFollow(organizationId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('organization_follows')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('organization_follows').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('organization_follows').insert({ organization_id: organizationId, user_id: userId });
    return true;
  }
}

export async function fetchFollowedOrganizations(userId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organization_follows')
    .select('organization_id')
    .eq('user_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { organization_id: string }) => r.organization_id);
  if (ids.length === 0) return [];
  const { data: orgs } = await supabase.from('organizations').select('*').in('id', ids);
  return (orgs as Organization[]) || [];
}
