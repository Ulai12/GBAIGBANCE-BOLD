import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
type EventRow = { id: string; title: string; category: string | null; attendees_count: number | null; views_count: number | null; starts_at: string | null; ends_at: string | null; status: string; created_at: string | null };
type TicketRow = { id: string; event_id: string; user_id: string | null; price_paid: number | string | null; status: string; created_at: string | null };
type ProfileRow = { id: string; role: string | null };
type TicketOptionRow = { id: string; event_id: string; quantity_sold: number | null };

const seedEventNames = new Set(['Afro-Fusion Festival 2025', 'Lomé Summer Jam 2025', 'Neon Vibe Night', 'Jazz at Marina', 'Art & Soul Gallery', 'Skyline Lounge Session', 'TechTogo Summit 2025', 'Festival Vodoun Cotonou']);
const seedArtistNames = new Set(['Kafui Mensah', 'Aminata Diallo', 'DJ Eklu', 'Kofi & The Roots', 'Sira Kone', 'Ama Rhythm']);
const seedOrganizationNames = new Set(['AfroVibe Events', 'Culture Bénin', 'Grand Place Productions']);
const isSeedEvent = (event: Pick<EventRow, 'id' | 'title'>) => event.id.startsWith('e1000000-') || seedEventNames.has(event.title);
const isSeedArtist = (artist: { id: string; name: string }) => artist.id.startsWith('b1000000-') || seedArtistNames.has(artist.name);
const isSeedOrganization = (organization: { id: string; name: string }) => organization.id.startsWith('a1000000-') || seedOrganizationNames.has(organization.name);

async function fetchAll<T>(queryPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 100_000; from += pageSize) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error('Platform statistics pagination limit reached');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Supabase server credentials are unavailable');
    // L'agrégat est public car le bloc de chiffres est public. La clé service_role
    // reste côté serveur et aucune donnée personnelle n'est renvoyée.
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const [rawEvents, rawTickets, profiles, rawOrganizations, rawArtists, rawTicketOptions] = await Promise.all([
      fetchAll<EventRow>((from, to) => admin.from('events').select('id, title, category, attendees_count, views_count, starts_at, ends_at, status, created_at').order('created_at', { ascending: true }).range(from, to)),
      fetchAll<TicketRow>((from, to) => admin.from('tickets').select('id, event_id, user_id, price_paid, status, created_at').order('created_at', { ascending: true }).range(from, to)),
      fetchAll<ProfileRow>((from, to) => admin.from('profiles').select('id, role').range(from, to)),
      fetchAll<{ id: string; name: string }>((from, to) => admin.from('organizations').select('id, name').range(from, to)),
      fetchAll<{ id: string; name: string }>((from, to) => admin.from('artists').select('id, name').range(from, to)),
      fetchAll<TicketOptionRow>((from, to) => admin.from('ticket_options').select('id, event_id, quantity_sold').range(from, to)),
    ]);

    // Les lignes de seed/demo ne sont pas des métriques d'engagement authentiques.
    // On les exclut de toutes les statistiques publiques sans supprimer les données.
    const events = rawEvents.filter((event) => !isSeedEvent(event));
    const realEventIds = new Set(events.map((event) => event.id));
    const tickets = rawTickets.filter((ticket) => realEventIds.has(ticket.event_id));
    const ticketOptions = rawTicketOptions.filter((option) => realEventIds.has(option.event_id));
    const organizations = rawOrganizations.filter((organization) => !isSeedOrganization(organization));
    const artists = rawArtists.filter((artist) => !isSeedArtist(artist));

    const authUsers: Array<{ id: string; invited_at?: string | null; confirmed_at?: string | null }> = [];
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const batch = data.users ?? [];
      authUsers.push(...batch.map((user) => ({ id: user.id, invited_at: user.invited_at, confirmed_at: user.confirmed_at })));
      if (batch.length < 1000) break;
      if (page === 100) throw new Error('Auth user pagination limit reached');
    }

    // Les invitations de compte non acceptées ne sont pas des utilisateurs inscrits.
    // Les participants externes sans compte n'existent pas dans Auth et sont comptés via attendees_count.
    const registeredUsers = authUsers.filter((user) => !(user.invited_at && !user.confirmed_at));
    const pendingPlatformInvitations = authUsers.length - registeredUsers.length;
    const roleByUser = new Map(profiles.map((profile) => [profile.id, String(profile.role || 'participant').toLowerCase()]));
    const nonParticipantRoles = new Set(['organizer', 'artist', 'admin']);
    const totalParticipantAccounts = registeredUsers.filter((user) => !nonParticipantRoles.has(roleByUser.get(user.id) || 'participant')).length;

    const now = Date.now();
    const activeEvents = events.filter((event) => event.status === 'published' && (!event.ends_at || Date.parse(event.ends_at) >= now));
    const attendanceEvents = events.filter((event) => ['published', 'completed'].includes(event.status));
    const totalParticipants = attendanceEvents.reduce((sum, event) => sum + Math.max(0, Number(event.attendees_count) || 0), 0);

    const countedStatuses = new Set(['active', 'valid', 'used']);
    const countedTickets = tickets.filter((ticket) => countedStatuses.has(String(ticket.status || '').toLowerCase()));
    const cancelledTickets = tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'cancelled');
    const refundedTickets = tickets.filter((ticket) => String(ticket.status || '').toLowerCase() === 'refunded');

    // quantity_sold représente les unités vendues : book_ticket peut créer une ligne
    // pour plusieurs places. Repli historique sur les billets persistés si inventaire vide.
    const inventorySold = ticketOptions.reduce((sum, option) => sum + Math.max(0, Number(option.quantity_sold) || 0), 0);
    const totalTickets = inventorySold > 0 ? inventorySold : countedTickets.length;
    const totalRevenue = Math.round(countedTickets.reduce((sum, ticket) => sum + Math.max(0, Number(ticket.price_paid) || 0), 0));
    const totalViews = events.reduce((sum, event) => sum + Math.max(0, Number(event.views_count) || 0), 0);

    const activeEventIds = new Set(activeEvents.map((event) => event.id));
    const eventById = new Map(events.map((event) => [event.id, event]));
    const soldByEvent = new Map<string, number>();
    for (const option of ticketOptions) soldByEvent.set(option.event_id, (soldByEvent.get(option.event_id) || 0) + Math.max(0, Number(option.quantity_sold) || 0));

    const categoryCounts = new Map<string, { events: number; tickets: number; amount: number }>();
    for (const event of activeEvents) {
      const category = String(event.category || 'other');
      const item = categoryCounts.get(category) ?? { events: 0, tickets: 0, amount: 0 };
      item.events += 1;
      item.tickets += soldByEvent.get(event.id) || 0;
      categoryCounts.set(category, item);
    }
    for (const ticket of countedTickets) {
      const event = eventById.get(ticket.event_id);
      if (!event || !activeEventIds.has(event.id)) continue;
      const category = String(event.category || 'other');
      const item = categoryCounts.get(category) ?? { events: 0, tickets: 0, amount: 0 };
      item.amount += Math.max(0, Number(ticket.price_paid) || 0);
      categoryCounts.set(category, item);
    }
    const useRevenue = [...categoryCounts.values()].some((item) => item.amount > 0);
    const categoryWeight = [...categoryCounts.values()].reduce((sum, item) => sum + (useRevenue ? item.amount : item.events), 0);
    const categoryShares = [...categoryCounts.entries()].map(([id, item]) => {
      const count = useRevenue ? item.tickets : item.events;
      const weight = useRevenue ? item.amount : item.events;
      return { id, count, amount: Math.round(item.amount), percent: categoryWeight > 0 ? Math.round((weight / categoryWeight) * 100) : 0 };
    }).sort((a, b) => b.percent - a.percent);

    const ticketsTimeline = countedTickets.map((ticket) => ({
      id: ticket.id, created_at: ticket.created_at || '', created_at_ms: ticket.created_at ? Date.parse(ticket.created_at) : 0,
      price_paid: Number(ticket.price_paid) || 0, event_id: ticket.event_id,
    }));
    const eventsTimeline = attendanceEvents.map((event) => ({
      id: event.id, starts_at_ms: event.starts_at ? Date.parse(event.starts_at) : 0,
      attendees: Math.max(0, Number(event.attendees_count) || 0),
    }));

    return json({
      totalEvents: activeEvents.length, totalAllEvents: events.length, totalArtists: artists.length, totalOrganizers: organizations.length,
      totalTickets, totalParticipants, totalParticipantAccounts, totalProfiles: profiles.length, totalPendingPlatformInvitations: pendingPlatformInvitations, totalUsers: registeredUsers.length,
      totalViews, totalRevenue, totalCancelledTickets: cancelledTickets.length, totalRefundedTickets: refundedTickets.length,
      categories: Object.fromEntries([...categoryCounts].map(([id, item]) => [id, item.events])),
      categoryBasis: useRevenue ? 'revenue' : 'events', categoryShares, ticketsTimeline, eventsTimeline,
    });
  } catch (error) {
    console.error('[platform-stats] aggregation failed', error);
    return json({ error: 'Unable to load platform statistics' }, 500);
  }
});
