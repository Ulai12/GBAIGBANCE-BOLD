import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Event, Organization } from '@/types';
import { isRealEvent, isRealOrganization, isEventActive } from '@/features/events/status';
import { getLocalStoredTickets } from '@/services/tickets';

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

    // 2. Fetch tickets for these events
    let tickets: Array<{
      id: string;
      event_id: string;
      ticket_type: string;
      quantity?: number;
      price_paid?: number;
      status?: string;
      created_at: string;
    }> = [];

    if (eventIds.length > 0 && isSupabaseConfigured) {
      const { data: dbTickets } = await supabase
        .from('tickets')
        .select('id, event_id, ticket_type, quantity, price_paid, status, created_at')
        .in('event_id', eventIds)
        .neq('status', 'cancelled');
      if (dbTickets) {
        tickets = dbTickets;
      }
    }

    // Also include any locally booked tickets for these events
    const localTickets = getLocalStoredTickets();
    localTickets.forEach((lt: Record<string, unknown>) => {
      const eId = typeof lt.event_id === 'string' ? lt.event_id : '';
      const tId = typeof lt.id === 'string' ? lt.id : '';
      if (eventIds.includes(eId) && !tickets.some((t) => t.id === tId)) {
        tickets.push({
          id: tId,
          event_id: eId,
          ticket_type: typeof lt.ticket_type === 'string' ? lt.ticket_type : 'standard',
          quantity: typeof lt.quantity === 'number' ? lt.quantity : 1,
          price_paid: typeof lt.price_paid === 'number' ? lt.price_paid : 0,
          status: typeof lt.status === 'string' ? lt.status : 'active',
          created_at: typeof lt.created_at === 'string' ? lt.created_at : new Date().toISOString(),
        });
      }
    });

    // 3. Build time points based on timeRange
    const now = new Date();
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 60;
    const timePointsMap = new Map<string, { label: string; date: string; ticketsSold: number; revenue: number }>();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: daysCount > 14 ? 'numeric' : 'short',
      });
      timePointsMap.set(isoDate, { date: isoDate, label, ticketsSold: 0, revenue: 0 });
    }

    // 4. Populate tickets into date buckets and categories
    const categoryTotals: Record<string, { count: number; revenue: number }> = {
      standard: { count: 0, revenue: 0 },
      vip: { count: 0, revenue: 0 },
      vvip: { count: 0, revenue: 0 },
      free: { count: 0, revenue: 0 },
    };

    let totalTickets = 0;
    let totalRevenue = 0;

    tickets.forEach((t) => {
      const qty = t.quantity || 1;
      const price = t.price_paid || 0;
      totalTickets += qty;
      totalRevenue += price;

      // Group by date
      const dateKey = (t.created_at || '').split('T')[0];
      if (timePointsMap.has(dateKey)) {
        const bucket = timePointsMap.get(dateKey)!;
        bucket.ticketsSold += qty;
        bucket.revenue += price;
      }

      // Group by ticket type
      const typeKey = (t.ticket_type || 'standard').toLowerCase();
      if (!categoryTotals[typeKey]) {
        categoryTotals[typeKey] = { count: 0, revenue: 0 };
      }
      categoryTotals[typeKey].count += qty;
      categoryTotals[typeKey].revenue += price;
    });

    // 5. Build cumulative curve
    let cumTickets = 0;
    let cumRev = 0;
    const timeSeries: PerformanceTimePoint[] = Array.from(timePointsMap.values()).map((pt) => {
      cumTickets += pt.ticketsSold;
      cumRev += pt.revenue;
      return {
        ...pt,
        cumulativeTickets: cumTickets,
        cumulativeRevenue: cumRev,
      };
    });

    // 6. Category breakdown formatting
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

    const categoryBreakdown: TicketTypeBreakdown[] = Object.entries(categoryTotals)
      .filter(([, val]) => val.count > 0)
      .map(([key, val]) => ({
        name: categoryLabels[key] || key.toUpperCase(),
        count: val.count,
        revenue: val.revenue,
        color: categoryColors[key] || '#6600FF',
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
