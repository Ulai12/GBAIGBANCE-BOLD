import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { MOCK_EVENTS, MOCK_ARTISTS, MOCK_ORGANIZATIONS, MOCK_TICKETS, getMockEventWithRelations } from '@/data/mockData';
import type { Event, EventWithRelations, Artist, Organization, TicketOption, EventCollaborator, Profile, PublicProfile, EventComment, EventReaction, EventQuestion, EventScheduleSlot, EventLiveLink, EventSponsor, SponsorTier, EventStatus } from '@/types';
import type { EventCategory } from '@/types';

// ==================== IMAGE UPLOAD ====================

export async function uploadEventImage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ==================== TICKET OPTIONS ====================

export async function fetchTicketOptions(eventId: string): Promise<TicketOption[]> {
  if (!isSupabaseConfigured) {
    return MOCK_TICKETS.filter((t) => t.event_id === eventId || eventId.startsWith('e1000000'));
  }
  try {
    const { data, error } = await supabase
      .from('ticket_options')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true });
    if (error || !data || data.length === 0) {
      return MOCK_TICKETS.filter((t) => t.event_id === eventId || eventId.startsWith('e1000000'));
    }
    return (data as TicketOption[]) || [];
  } catch {
    return MOCK_TICKETS.filter((t) => t.event_id === eventId || eventId.startsWith('e1000000'));
  }
}

export async function createTicketOption(option: Omit<TicketOption, 'id' | 'created_at' | 'quantity_sold'>): Promise<TicketOption | null> {
  const { data, error } = await supabase
    .from('ticket_options')
    .insert(option)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as TicketOption | null;
}

// ==================== BOOKING ====================

export async function bookTicket(eventId: string, ticketOptionId: string, quantity: number = 1): Promise<{ success: boolean; ticket?: unknown; error?: string }> {
  if (!isSupabaseConfigured) {
    const mockTicket = {
      id: 'ticket-' + Math.random().toString(36).slice(2, 9),
      event_id: eventId,
      user_id: 'mock-user',
      ticket_type: 'standard',
      quantity,
      price_paid: 5000 * quantity,
      currency: 'XOF',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    return { success: true, ticket: mockTicket };
  }
  const { data, error } = await supabase.rpc('book_ticket', {
    p_event_id: eventId,
    p_ticket_option_id: ticketOptionId,
    p_quantity: quantity,
  });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string; ticket?: unknown };
  if (result.error) return { success: false, error: result.error };
  return { success: true, ticket: result.ticket };
}

export async function cancelTicket(ticketId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_ticket', { p_ticket_id: ticketId });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string };
  if (result.error) return { success: false, error: result.error };
  return { success: true };
}

export async function setEventStatus(eventId: string, status: Exclude<EventStatus, 'pending'>, reason?: string): Promise<void> {
  const { data, error } = await supabase.rpc('set_event_status', {
    p_event_id: eventId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw error;
  const result = data as { success?: boolean; error?: string };
  if (!result.success) throw new Error(result.error || 'Transition de statut impossible');
}

export async function fetchUserTickets(userId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, event:events(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== COLLABORATION ====================

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role')
    .in('id', unique);
  (data || []).forEach((p) => map.set(p.id, p as PublicProfile));
  return map;
}

export async function fetchCollaborators(eventId: string): Promise<EventCollaborator[]> {
  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  const collabs = (data as EventCollaborator[]) || [];
  const profileMap = await fetchProfilesByIds(collabs.map((c) => c.user_id));
  collabs.forEach((c) => { c.profile = profileMap.get(c.user_id); });
  return collabs;
}

export async function inviteCollaborator(eventId: string, userId: string, role: 'co_organizer' | 'performer', invitedBy: string): Promise<void> {
  const { error } = await supabase
    .from('event_collaborators')
    .insert({ event_id: eventId, user_id: userId, role, invited_by: invitedBy, status: 'pending' });
  if (error) throw error;
}

export async function respondToInvitation(collaboratorId: string, status: 'accepted' | 'declined'): Promise<void> {
  if (status === 'accepted') {
    const { error } = await supabase.rpc('accept_collaboration', { p_collaborator_id: collaboratorId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('event_collaborators')
      .update({ status: 'declined' })
      .eq('id', collaboratorId);
    if (error) throw error;
  }
}

export async function fetchPendingInvitations(userId: string): Promise<(EventCollaborator & { event?: Event })[]> {
  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, event:events(*)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as (EventCollaborator & { event?: Event })[]) || [];
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('id', collaboratorId);
  if (error) throw error;
}

// ==================== SEARCH USERS FOR COLLABORATION ====================

export async function searchArtists(query: string): Promise<Artist[]> {
  const { data: seedArtists, error: err1 } = await supabase
    .from('artists')
    .select('*')
    .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
    .limit(20);
  if (err1) throw err1;
  const { data: profileArtists, error: err2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'artist')
    .ilike('name', `%${query}%`)
    .limit(20);
  if (err2) throw err2;
  const fromProfiles = (profileArtists || []).map((p: Profile) => ({
    id: p.id, user_id: p.id, name: p.name, bio: p.bio, photo_url: p.avatar_url, cover_url: null,
    genres: [], city: p.city, country: p.country, instagram_url: null, twitter_url: null,
    youtube_url: null, spotify_url: null, followers_count: 0, events_count: 0, is_verified: false, created_at: p.created_at,
  })) as Artist[];
  const seen = new Set<string>();
  const merged = [...(seedArtists || []), ...fromProfiles].filter((a) => {
    const key = a.user_id || a.id;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return merged as Artist[];
}

export async function searchOrganizations(query: string): Promise<Organization[]> {
  const { data: seedOrgs, error: err1 } = await supabase
    .from('organizations')
    .select('*')
    .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
    .limit(20);
  if (err1) throw err1;
  const { data: profileOrgs, error: err2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'organizer')
    .ilike('name', `%${query}%`)
    .limit(20);
  if (err2) throw err2;
  const fromProfiles = (profileOrgs || []).map((p: Profile) => ({
    id: p.id, owner_id: p.id, name: p.name, description: p.bio, logo_url: p.avatar_url, cover_url: null,
    website: null, phone: p.phone, email: p.email, city: p.city, country: p.country,
    verification_status: 'pending' as const, followers_count: 0, events_count: 0, created_at: p.created_at,
  })) as Organization[];
  const seen = new Set<string>();
  const merged = [...(seedOrgs || []), ...fromProfiles].filter((o) => {
    const key = o.owner_id || o.id;
    if (key && seen.has(key)) return false;
    if (key) seen.add(key); return true;
  });
  return merged as Organization[];
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return (data as Profile[]) || [];
}

// ==================== CREATE EVENT WITH COLLABORATORS ====================

export async function createEventWithCollaborators(
  eventData: {
    title: string; description: string; category: EventCategory; location_name: string;
    city: string; starts_at: string; price_min: number; cover_url: string;
    capacity?: number; created_by_role: 'organizer' | 'artist';
  },
  collaborators: { user_id: string; role: 'co_organizer' | 'performer' }[],
  ticketOptions: { ticket_type: string; label: string; price: number; quantity_total: number; description?: string }[],
  organizerUserId: string,
): Promise<Event | null> {
  if (!organizerUserId) throw new Error('Utilisateur non identifié. Reconnectez-vous.');
  if (!eventData.title.trim()) throw new Error('Le titre est obligatoire.');
  if (!eventData.starts_at) throw new Error("La date et l'heure sont obligatoires.");
  const validCollaborators = collaborators.filter((c) => c.user_id && c.user_id.trim());
  const validTicketTypes = ['free', 'standard', 'vip', 'vvip'];
  const validTickets = ticketOptions.filter((t) => t.label.trim() && validTicketTypes.includes(t.ticket_type));
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: eventData.title.trim(), description: eventData.description || null, category: eventData.category,
      location_name: eventData.location_name || 'Lieu à définir', city: eventData.city,
      starts_at: new Date(eventData.starts_at).toISOString(), price_min: eventData.price_min,
      cover_url: eventData.cover_url || null, capacity: eventData.capacity || null,
      organizer_user_id: organizerUserId, created_by_role: eventData.created_by_role,
      status: validCollaborators.length > 0 ? 'pending' : 'published',
    })
    .select().maybeSingle();
  if (eventError) throw new Error(eventError.message || "Erreur lors de la création de l'événement");
  const createdEvent = event as Event | null;
  if (!createdEvent) return null;
  if (validTickets.length > 0) {
    const optionsToInsert = validTickets.map((opt) => ({
      event_id: createdEvent.id, ticket_type: opt.ticket_type, label: opt.label.trim(),
      price: opt.price, quantity_total: opt.quantity_total, description: opt.description || null,
    }));
    const { error: optError } = await supabase.from('ticket_options').insert(optionsToInsert);
    if (optError) throw new Error(optError.message || "Erreur lors de l'ajout des billets");
  }
  if (validCollaborators.length > 0) {
    const collabsToInsert = validCollaborators.map((c) => ({
      event_id: createdEvent.id, user_id: c.user_id, role: c.role,
      invited_by: organizerUserId, status: 'pending' as const,
    }));
    const { error: collabError } = await supabase.from('event_collaborators').insert(collabsToInsert);
    if (collabError) throw new Error(collabError.message || "Erreur lors de l'invitation des collaborateurs");
  }
  return createdEvent;
}

// ==================== DELETE EVENT ====================

export async function fetchEventDeletionInfo(eventId: string): Promise<{ ticketsCount: number; collaboratorsCount: number; ticketOptionsCount: number; likesCount: number }> {
  const [tickets, collabs, options, likes] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).neq('status', 'cancelled'),
    supabase.from('event_collaborators').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('ticket_options').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_likes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);
  return { ticketsCount: tickets.count || 0, collaboratorsCount: collabs.count || 0, ticketOptionsCount: options.count || 0, likesCount: likes.count || 0 };
}

export async function cancelEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
  if (error) throw new Error(error.message || "Erreur lors de l'annulation");
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw new Error(error.message || 'Erreur lors de la suppression');
}

// ==================== INTERACTIONS ====================

export async function fetchEventComments(eventId: string): Promise<EventComment[]> {
  const { data, error } = await supabase.from('event_comments').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) throw error;
  const comments = (data as EventComment[]) || [];
  const profileMap = await fetchProfilesByIds(comments.map((c) => c.user_id));
  comments.forEach((c) => { c.profile = profileMap.get(c.user_id); });
  return comments;
}

export async function addEventComment(eventId: string, _userId: string, body: string, isOrganizerReply = false): Promise<void> {
  const { error } = await supabase.from('event_comments').insert({ event_id: eventId, body, is_organizer_reply: isOrganizerReply });
  if (error) throw new Error(error.message);
}

export async function deleteEventComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}

export async function fetchEventReactions(eventId: string): Promise<EventReaction[]> {
  const { data, error } = await supabase.from('event_reactions').select('*').eq('event_id', eventId);
  if (error) throw error;
  return (data as EventReaction[]) || [];
}

export async function toggleEventReaction(eventId: string, userId: string, emoji: string): Promise<void> {
  const { data: existing } = await supabase.from('event_reactions').select('id').eq('event_id', eventId).eq('user_id', userId).eq('emoji', emoji).maybeSingle();
  if (existing) {
    const { error: delErr } = await supabase.from('event_reactions').delete().eq('id', existing.id);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { error: insErr } = await supabase.from('event_reactions').insert({ event_id: eventId, emoji });
    if (insErr) throw new Error(insErr.message);
  }
}

export async function fetchEventQuestions(eventId: string): Promise<EventQuestion[]> {
  const { data, error } = await supabase.from('event_questions').select('*').eq('event_id', eventId).order('answered_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw error;
  const questions = (data as EventQuestion[]) || [];
  const ids = questions.flatMap((q) => [q.user_id, q.answered_by].filter(Boolean) as string[]);
  const profileMap = await fetchProfilesByIds(ids);
  questions.forEach((q) => {
    q.profile = profileMap.get(q.user_id);
    if (q.answered_by) q.answerer = profileMap.get(q.answered_by);
  });
  return questions;
}

export async function addEventQuestion(eventId: string, _userId: string, question: string): Promise<void> {
  const { error } = await supabase.from('event_questions').insert({ event_id: eventId, question });
  if (error) throw new Error(error.message);
}

export async function answerEventQuestion(questionId: string, answer: string, answeredBy: string): Promise<void> {
  const { error } = await supabase.from('event_questions').update({ answer, answered_by: answeredBy, answered_at: new Date().toISOString() }).eq('id', questionId);
  if (error) throw new Error(error.message);
}

export async function toggleOrganizationFollow(organizationId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase.from('organization_follows').select('id').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle();
  if (existing) { await supabase.from('organization_follows').delete().eq('id', existing.id); return false; }
  await supabase.from('organization_follows').insert({ organization_id: organizationId, user_id: userId }); return true;
}

// ==================== SCHEDULE ====================

export async function fetchEventSchedule(eventId: string): Promise<(EventScheduleSlot & { artist?: Artist })[]> {
  const { data, error } = await supabase.from('event_schedule').select(`*, artist:artists!event_schedule_artist_id_fkey(id, name, photo_url, is_verified, genres)`).eq('event_id', eventId).order('start_time', { ascending: true });
  if (error) throw error;
  return (data as (EventScheduleSlot & { artist?: Artist })[]) || [];
}

export async function addScheduleSlot(slot: Omit<EventScheduleSlot, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('event_schedule').insert(slot);
  if (error) throw new Error(error.message);
}

export async function updateScheduleSlot(id: string, updates: Partial<EventScheduleSlot>): Promise<void> {
  const { error } = await supabase.from('event_schedule').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  const { error } = await supabase.from('event_schedule').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ==================== LIVE LINKS ====================

export async function fetchEventLiveLinks(eventId: string): Promise<EventLiveLink[]> {
  const { data, error } = await supabase.from('event_live_links').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EventLiveLink[]) || [];
}

export async function addEventLiveLink(eventId: string, platform: string, url: string, title?: string): Promise<void> {
  const { error } = await supabase.from('event_live_links').insert({ event_id: eventId, platform, url, title });
  if (error) throw new Error(error.message);
}

export async function toggleLiveLink(linkId: string, isLive: boolean): Promise<void> {
  const { error } = await supabase.from('event_live_links').update({ is_live: isLive }).eq('id', linkId);
  if (error) throw new Error(error.message);
}

export async function deleteEventLiveLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('event_live_links').delete().eq('id', linkId);
  if (error) throw new Error(error.message);
}

// ==================== SPONSORS ====================

export async function fetchEventSponsors(eventId: string): Promise<EventSponsor[]> {
  const { data, error } = await supabase.from('event_sponsors').select('*').eq('event_id', eventId).order('tier', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EventSponsor[]) || [];
}

export async function addEventSponsor(sponsor: { event_id: string; name: string; website_url?: string; logo_url?: string; tier: SponsorTier; logo_source?: 'auto' | 'manual' }): Promise<void> {
  const { error } = await supabase.from('event_sponsors').insert(sponsor);
  if (error) throw new Error(error.message);
}

export async function updateEventSponsor(id: string, updates: Partial<EventSponsor>): Promise<void> {
  const { error } = await supabase.from('event_sponsors').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEventSponsor(id: string): Promise<void> {
  const { error } = await supabase.from('event_sponsors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function getFaviconUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  } catch { return ''; }
}

// ==================== STATS ====================

export async function fetchPlatformStats(): Promise<{ totalEvents: number; totalArtists: number; totalOrganizers: number; totalTickets: number; totalParticipants: number }> {
  if (!isSupabaseConfigured) {
    return {
      totalEvents: MOCK_EVENTS.length,
      totalArtists: MOCK_ARTISTS.length,
      totalOrganizers: MOCK_ORGANIZATIONS.length,
      totalTickets: 1240,
      totalParticipants: 4850,
    };
  }
  try {
    const [events, artists, orgs, tickets, participants] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'cancelled'),
      supabase.from('events').select('attendees_count'),
    ]);
    return {
      totalEvents: events.count || MOCK_EVENTS.length, totalArtists: artists.count || MOCK_ARTISTS.length, totalOrganizers: orgs.count || MOCK_ORGANIZATIONS.length,
      totalTickets: tickets.count || 1240,
      totalParticipants: (participants.data || []).reduce((sum: number, e: { attendees_count: number }) => sum + (e.attendees_count || 0), 4850),
    };
  } catch {
    return {
      totalEvents: MOCK_EVENTS.length,
      totalArtists: MOCK_ARTISTS.length,
      totalOrganizers: MOCK_ORGANIZATIONS.length,
      totalTickets: 1240,
      totalParticipants: 4850,
    };
  }
}

export async function fetchOrganizerStats(userId: string): Promise<{ totalEvents: number; totalAttendees: number; totalViews: number; totalLikes: number; totalTickets: number; totalRevenue: number; activeEvents: number }> {
  if (!isSupabaseConfigured) {
    return {
      totalEvents: 4,
      totalAttendees: 1840,
      totalViews: 32400,
      totalLikes: 1420,
      totalTickets: 420,
      totalRevenue: 2800000,
      activeEvents: 3,
    };
  }
  try {
    const { data: events } = await supabase.from('events').select('*').eq('organizer_user_id', userId);
    const eventIds = (events || []).map((e) => e.id);
    const baseStats = {
      totalEvents: events?.length || 0, totalAttendees: events?.reduce((s, e) => s + e.attendees_count, 0) || 0,
      totalViews: events?.reduce((s, e) => s + e.views_count, 0) || 0, totalLikes: events?.reduce((s, e) => s + e.likes_count, 0) || 0,
      activeEvents: events?.filter((e) => e.status === 'published' && new Date(e.starts_at) > new Date()).length || 0,
      totalTickets: 0, totalRevenue: 0,
    };
    if (eventIds.length === 0) return baseStats;
    const { data: tickets } = await supabase.from('tickets').select('price_paid, status').in('event_id', eventIds).neq('status', 'cancelled');
    baseStats.totalTickets = tickets?.length || 0;
    baseStats.totalRevenue = tickets?.reduce((s, t) => s + (t.price_paid || 0), 0) || 0;
    return baseStats;
  } catch {
    return {
      totalEvents: 4,
      totalAttendees: 1840,
      totalViews: 32400,
      totalLikes: 1420,
      totalTickets: 420,
      totalRevenue: 2800000,
      activeEvents: 3,
    };
  }
}

export async function fetchArtistStats(artistId: string): Promise<{ totalEvents: number; totalFollowers: number; upcomingEvents: number; totalViews: number }> {
  if (!isSupabaseConfigured) {
    const artist = MOCK_ARTISTS.find((a) => a.id === artistId) || MOCK_ARTISTS[0];
    return {
      totalEvents: artist.events_count,
      totalFollowers: artist.followers_count,
      upcomingEvents: 3,
      totalViews: 18400,
    };
  }
  try {
    const { data: artistEvents } = await supabase.from('event_artists').select('event_id').eq('artist_id', artistId);
    const eventIds = (artistEvents || []).map((r: { event_id: string }) => r.event_id);
    if (eventIds.length === 0) {
      const { count } = await supabase.from('artist_follows').select('id', { count: 'exact', head: true }).eq('artist_id', artistId);
      return { totalEvents: 0, totalFollowers: count || 0, upcomingEvents: 0, totalViews: 0 };
    }
    const [events, followers] = await Promise.all([
      supabase.from('events').select('views_count, starts_at, status').in('id', eventIds),
      supabase.from('artist_follows').select('id', { count: 'exact', head: true }).eq('artist_id', artistId),
    ]);
    const eventData = events.data || [];
    return {
      totalEvents: eventData.length, totalFollowers: followers.count || 0,
      upcomingEvents: eventData.filter((e) => e.status === 'published' && new Date(e.starts_at) > new Date()).length,
      totalViews: eventData.reduce((s, e) => s + (e.views_count || 0), 0),
    };
  } catch {
    return {
      totalEvents: 5,
      totalFollowers: 1200,
      upcomingEvents: 2,
      totalViews: 8500,
    };
  }
}

// ==================== EXISTING QUERIES ====================

export async function fetchFeaturedEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return MOCK_EVENTS.filter((e) => e.is_featured);
  }
  try {
    const { data, error } = await supabase.from('events').select('*').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('is_featured', { ascending: false }).order('starts_at', { ascending: true }).limit(10);
    if (error || !data || data.length === 0) return MOCK_EVENTS.filter((e) => e.is_featured);
    return data as Event[];
  } catch {
    return MOCK_EVENTS.filter((e) => e.is_featured);
  }
}

export async function fetchEventsByCategory(category: EventCategory): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return MOCK_EVENTS.filter((e) => e.category === category);
  }
  try {
    const { data, error } = await supabase.from('events').select('*').eq('status', 'published').eq('category', category).order('starts_at', { ascending: true }).limit(20);
    if (error || !data || data.length === 0) return MOCK_EVENTS.filter((e) => e.category === category);
    return data as Event[];
  } catch {
    return MOCK_EVENTS.filter((e) => e.category === category);
  }
}

export async function fetchTrendingEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return [...MOCK_EVENTS].sort((a, b) => b.views_count - a.views_count).slice(0, 5);
  }
  try {
    const { data, error } = await supabase.from('events').select('*').eq('status', 'published').gte('starts_at', new Date().toISOString()).order('views_count', { ascending: false }).order('starts_at', { ascending: true }).limit(10);
    if (error || !data || data.length === 0) return [...MOCK_EVENTS].sort((a, b) => b.views_count - a.views_count).slice(0, 5);
    return data as Event[];
  } catch {
    return [...MOCK_EVENTS].sort((a, b) => b.views_count - a.views_count).slice(0, 5);
  }
}

export async function fetchUpcomingEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return [...MOCK_EVENTS].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 6);
  }
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('events').select('*').eq('status', 'published').gte('starts_at', now).order('starts_at', { ascending: true }).limit(10);
    if (error || !data || data.length === 0) return [...MOCK_EVENTS].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 6);
    return data as Event[];
  } catch {
    return [...MOCK_EVENTS].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).slice(0, 6);
  }
}

export async function fetchEventById(id: string): Promise<EventWithRelations | null> {
  if (!isSupabaseConfigured) {
    return getMockEventWithRelations(id) || getMockEventWithRelations(MOCK_EVENTS[0].id);
  }
  try {
    const { data, error } = await supabase.from('events').select(`*, event_artists ( artist:artists (*), ), organizer:organizations (*)`).eq('id', id).maybeSingle();
    if (error || !data) return getMockEventWithRelations(id) || getMockEventWithRelations(MOCK_EVENTS[0].id);
    return data as EventWithRelations | null;
  } catch {
    return getMockEventWithRelations(id) || getMockEventWithRelations(MOCK_EVENTS[0].id);
  }
}

export async function searchEvents(query: string): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    const q = query.toLowerCase();
    return MOCK_EVENTS.filter((e) => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)) || e.location_name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q));
  }
  try {
    const { data, error } = await supabase.from('events').select('*').eq('status', 'published').or(`title.ilike.%${query}%,description.ilike.%${query}%,location_name.ilike.%${query}%,city.ilike.%${query}%`).order('starts_at', { ascending: true }).limit(30);
    if (error || !data) {
      const q = query.toLowerCase();
      return MOCK_EVENTS.filter((e) => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)) || e.location_name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q));
    }
    return data as Event[];
  } catch {
    const q = query.toLowerCase();
    return MOCK_EVENTS.filter((e) => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)) || e.location_name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q));
  }
}

export async function fetchFeaturedArtists(): Promise<Artist[]> {
  if (!isSupabaseConfigured) {
    return MOCK_ARTISTS;
  }
  try {
    const { data, error } = await supabase.from('artists').select('*').order('followers_count', { ascending: false }).limit(10);
    if (error || !data || data.length === 0) return MOCK_ARTISTS;
    return data as Artist[];
  } catch {
    return MOCK_ARTISTS;
  }
}

export async function fetchVerifiedOrganizations(): Promise<Organization[]> {
  if (!isSupabaseConfigured) {
    return MOCK_ORGANIZATIONS;
  }
  try {
    const { data, error } = await supabase.from('organizations').select('*').eq('verification_status', 'verified').order('followers_count', { ascending: false }).limit(10);
    if (error || !data || data.length === 0) return MOCK_ORGANIZATIONS;
    return data as Organization[];
  } catch {
    return MOCK_ORGANIZATIONS;
  }
}

export async function fetchArtistById(id: string): Promise<Artist | null> {
  if (!isSupabaseConfigured) {
    return MOCK_ARTISTS.find((a) => a.id === id) || MOCK_ARTISTS[0];
  }
  try {
    const { data, error } = await supabase.from('artists').select('*').eq('id', id).maybeSingle();
    if (error || !data) return MOCK_ARTISTS.find((a) => a.id === id) || MOCK_ARTISTS[0];
    return data as Artist | null;
  } catch {
    return MOCK_ARTISTS.find((a) => a.id === id) || MOCK_ARTISTS[0];
  }
}

export async function fetchEventsByArtist(artistId: string): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return MOCK_EVENTS.slice(0, 3);
  }
  try {
    const { data, error } = await supabase.from('events').select(`*, event_artists!inner (artist_id)`).eq('event_artists.artist_id', artistId).eq('status', 'published').order('starts_at', { ascending: false });
    if (error || !data || data.length === 0) return MOCK_EVENTS.slice(0, 3);
    return (data as unknown as Event[]) ?? [];
  } catch {
    return MOCK_EVENTS.slice(0, 3);
  }
}

export async function toggleEventLike(eventId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase.from('event_likes').select('*').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (existing) { await supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', userId); await supabase.rpc('decrement_likes_count', { event_id: eventId }); return false; }
  await supabase.from('event_likes').insert({ event_id: eventId, user_id: userId }); await supabase.rpc('increment_likes_count', { event_id: eventId }); return true;
}

export async function toggleArtistFollow(artistId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase.from('artist_follows').select('*').eq('artist_id', artistId).eq('user_id', userId).maybeSingle();
  if (existing) { await supabase.from('artist_follows').delete().eq('artist_id', artistId).eq('user_id', userId); return false; }
  await supabase.from('artist_follows').insert({ artist_id: artistId, user_id: userId }); return true;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string; user_id: string; actor_id: string | null; type: string;
  entity_type: string | null; entity_id: string | null; title: string;
  body: string | null; is_read: boolean; created_at: string;
  actor?: { name: string; avatar_url: string | null } | null;
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  const notifications = (data as Notification[]) || [];
  const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter(Boolean) as string[])];
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from('profiles').select('id, name, avatar_url').in('id', actorIds);
    const actorMap = new Map((actors || []).map((a: { id: string; name: string; avatar_url: string | null }) => [a.id, { name: a.name, avatar_url: a.avatar_url }]));
    notifications.forEach((n) => { if (n.actor_id) n.actor = actorMap.get(n.actor_id) || null; });
  }
  return notifications;
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  if (error) throw new Error(error.message);
}

// ==================== ORGANIZATION DETAIL ====================

export async function fetchOrganizationById(id: string): Promise<Organization | null> {
  if (!isSupabaseConfigured) {
    return MOCK_ORGANIZATIONS.find((o) => o.id === id) || MOCK_ORGANIZATIONS[0];
  }
  try {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
    if (error || !data) return MOCK_ORGANIZATIONS.find((o) => o.id === id) || MOCK_ORGANIZATIONS[0];
    return data as Organization | null;
  } catch {
    return MOCK_ORGANIZATIONS.find((o) => o.id === id) || MOCK_ORGANIZATIONS[0];
  }
}

export async function fetchEventsByOrganization(orgId: string): Promise<Event[]> {
  if (!isSupabaseConfigured) {
    return MOCK_EVENTS.filter((e) => e.organizer_id === orgId || !e.organizer_id);
  }
  try {
    const { data, error } = await supabase.from('events').select('*').eq('organizer_id', orgId).eq('status', 'published').order('starts_at', { ascending: false });
    if (error || !data || data.length === 0) return MOCK_EVENTS.filter((e) => e.organizer_id === orgId || !e.organizer_id);
    return (data as Event[]) || [];
  } catch {
    return MOCK_EVENTS.filter((e) => e.organizer_id === orgId || !e.organizer_id);
  }
}

export async function isFollowingOrganization(orgId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from('organization_follows').select('id').eq('organization_id', orgId).eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function isFollowingArtist(artistId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from('artist_follows').select('id').eq('artist_id', artistId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// ==================== NOTIFICATION PREFERENCES ====================

export interface NotificationPreferences {
  user_id: string; new_comments: boolean; comment_replies: boolean;
  new_questions: boolean; question_answered: boolean; new_followers: boolean;
  invite_accepted: boolean; event_reminders: boolean; push_enabled: boolean;
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const defaults: NotificationPreferences = {
      user_id: userId, new_comments: true, comment_replies: true, new_questions: true,
      question_answered: true, new_followers: true, invite_accepted: true, event_reminders: true, push_enabled: false,
    };
    const { data: inserted, error: insError } = await supabase.from('notification_preferences').insert(defaults).select().maybeSingle();
    if (insError) return defaults;
    return (inserted as NotificationPreferences) || defaults;
  }
  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void> {
  const { error } = await supabase.from('notification_preferences').update({ ...prefs, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ==================== USER FOLLOWS ====================

export async function toggleUserFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const { data: existing } = await supabase.from('user_follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
  if (existing) { await supabase.from('user_follows').delete().eq('id', existing.id); return false; }
  await supabase.from('user_follows').insert({ follower_id: followerId, following_id: followingId }); return true;
}

export async function isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase.from('user_follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
  return !!data;
}

export async function fetchFollowingUsers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('user_follows').select('following_id').eq('follower_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const profileMap = await fetchProfilesByIds(ids);
  return ids.map((id: string) => profileMap.get(id)).filter(Boolean) as Profile[];
}

export async function fetchUserFollowersCount(userId: string): Promise<number> {
  const { count } = await supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId);
  return count || 0;
}

export async function fetchUserFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId);
  return count || 0;
}

// ==================== FOLLOWED ARTISTS & ORGANIZERS ====================

export async function fetchFollowedArtists(userId: string): Promise<Artist[]> {
  const { data, error } = await supabase.from('artist_follows').select('artist_id').eq('user_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { artist_id: string }) => r.artist_id);
  if (ids.length === 0) return [];
  const { data: artists } = await supabase.from('artists').select('*').in('id', ids);
  return (artists as Artist[]) || [];
}

export async function fetchFollowedOrganizations(userId: string): Promise<Organization[]> {
  const { data, error } = await supabase.from('organization_follows').select('organization_id').eq('user_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { organization_id: string }) => r.organization_id);
  if (ids.length === 0) return [];
  const { data: orgs } = await supabase.from('organizations').select('*').in('id', ids);
  return (orgs as Organization[]) || [];
}

// ==================== EVENT VIEWS (realtime) ====================

export async function incrementEventViews(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_event_views', { p_event_id: eventId });
  if (error) throw error;
}

export function subscribeToEventViews(eventId: string, callback: (views: number) => void) {
  const channel = supabase.channel(`event-views-${eventId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload: { new: { views_count: number } }) => { callback(payload.new.views_count); }).subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToEventAttendees(eventId: string, callback: (count: number) => void) {
  const channel = supabase.channel(`event-attendees-${eventId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, (payload: { new: { attendees_count: number } }) => { callback(payload.new.attendees_count); }).subscribe();
  return () => supabase.removeChannel(channel);
}

// ==================== FETCH PROFILE BY ID ====================

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
