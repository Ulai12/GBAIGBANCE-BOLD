import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Event, EventWithRelations, Artist, Organization, EventCollaborator, Profile, PublicProfile, EventComment, EventReaction, EventQuestion, EventScheduleSlot, EventLiveLink, EventSponsor, SponsorTier, EventStatus } from '@/types';
import type { EventCategory } from '@/types';

// Re-export decomposed domain modules for architectural cleanliness and backward-compatibility
export * from '@/features/events/status';
export * from '@/features/events/interactions';
export * from '@/features/events/program';
export * from '@/features/tickets/service';
export * from '@/features/organizers/service';
export * from '@/features/notifications/service';
export * from '@/features/users/follows';

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

/**
 * Sanitizes search input to prevent PostgREST filter injections (.or, .ilike)
 */
export function sanitizeFilterInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export async function searchArtists(query: string): Promise<Artist[]> {
  const sanitized = sanitizeFilterInput(query);
  if (!sanitized) return [];
  const { data: seedArtists, error: err1 } = await supabase
    .from('artists')
    .select('*')
    .or(`name.ilike.%${sanitized}%,city.ilike.%${sanitized}%`)
    .limit(20);
  if (err1) throw err1;
  const { data: profileArtists, error: err2 } = await supabase
    .from('profiles')
    .select('id, name, bio, avatar_url, city, country, created_at')
    .eq('role', 'artist')
    .ilike('name', `%${sanitized}%`)
    .limit(20);
  if (err2) throw err2;
  const fromProfiles = (profileArtists || []).map((p: Partial<Profile>) => ({
    id: p.id || '', user_id: p.id, name: p.name || '', bio: p.bio || null, photo_url: p.avatar_url || null, cover_url: null,
    genres: [], city: p.city || 'Lomé', country: p.country || 'TG', instagram_url: null, twitter_url: null,
    youtube_url: null, spotify_url: null, followers_count: 0, events_count: 0, is_verified: false, created_at: p.created_at || new Date().toISOString(),
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
  const sanitized = sanitizeFilterInput(query);
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
  const fromProfiles = (profileOrgs || []).map((p: Partial<Profile>) => ({
    id: p.id || '', owner_id: p.id || '', name: p.name || '', description: p.bio || null, logo_url: p.avatar_url || null, cover_url: null,
    website: null, phone: null, email: null, city: p.city || 'Lomé', country: p.country || 'TG',
    verification_status: 'pending' as const, followers_count: 0, events_count: 0, created_at: p.created_at || new Date().toISOString(),
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
  const sanitized = sanitizeFilterInput(query);
  if (!sanitized) return [];
  // Restrict to safe public profile fields; never expose phone or email in directory search
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role, city, country, bio, created_at')
    .ilike('name', `%${sanitized}%`)
    .limit(20);
  if (error) throw error;
  return (data as Profile[]) || [];
}

// ==================== CREATE EVENT WITH COLLABORATORS ====================

const ALLOWED_DB_CATEGORIES: EventCategory[] = [
  'concert', 'festival', 'conference', 'formation', 'exposition', 'spectacle', 'cultural', 'private',
];

export function normalizeEventCategory(cat?: string | null): EventCategory {
  if (cat && ALLOWED_DB_CATEGORIES.includes(cat as EventCategory)) {
    return cat as EventCategory;
  }
  return 'concert';
}

export async function createEventWithCollaborators(
  eventData: {
    title: string;
    description: string;
    category: EventCategory;
    subcategory?: string | null;
    location_name: string;
    location_address?: string | null;
    city: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    starts_at: string;
    ends_at?: string | null;
    price_min: number;
    cover_url: string;
    images?: string[];
    video_url?: string | null;
    capacity?: number;
    created_by_role: 'organizer' | 'artist';
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

  const safeCategory = normalizeEventCategory(eventData.category);

  // Preserve subcategory tag in description if provided so it is never lost
  let formattedDescription = eventData.description ? eventData.description.trim() : '';
  if (eventData.subcategory && !formattedDescription.includes(`[Sous-catégorie:`)) {
    formattedDescription = `[Sous-catégorie: ${eventData.subcategory}]\n${formattedDescription}`.trim();
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: eventData.title.trim(),
      description: formattedDescription || null,
      category: safeCategory,
      location_name: eventData.location_name || 'Lieu à définir',
      location_address: eventData.location_address || null,
      city: eventData.city,
      country: eventData.country || 'TG',
      latitude: eventData.latitude ?? null,
      longitude: eventData.longitude ?? null,
      starts_at: new Date(eventData.starts_at).toISOString(),
      ends_at: eventData.ends_at ? new Date(eventData.ends_at).toISOString() : null,
      price_min: eventData.price_min,
      cover_url: eventData.cover_url || null,
      images: eventData.images || [],
      capacity: eventData.capacity || null,
      organizer_user_id: organizerUserId,
      created_by_role: eventData.created_by_role,
      status: validCollaborators.length > 0 ? 'pending' : 'published',
    })
    .select()
    .maybeSingle();

  if (eventError) throw new Error(eventError.message || "Erreur lors de la création de l'événement");
  const createdEvent = event as Event | null;
  if (!createdEvent) return null;

  // If video_url was provided, save in event_live_links
  if (eventData.video_url && eventData.video_url.trim()) {
    try {
      await supabase.from('event_live_links').insert({
        event_id: createdEvent.id,
        platform: 'video',
        url: eventData.video_url.trim(),
        title: 'Vidéo Teaser',
      });
    } catch {
      // Non-blocking
    }
  }

  // Populate client-side subcategory & video_url
  createdEvent.subcategory = eventData.subcategory || null;
  createdEvent.video_url = eventData.video_url || null;

  if (validTickets.length > 0) {
    const optionsToInsert = validTickets.map((opt) => ({
      event_id: createdEvent.id,
      ticket_type: opt.ticket_type,
      label: opt.label.trim(),
      price: opt.price,
      quantity_total: opt.quantity_total,
      description: opt.description || null,
    }));
    const { error: optError } = await supabase.from('ticket_options').insert(optionsToInsert);
    if (optError) throw new Error(optError.message || "Erreur lors de l'ajout des billets");
  }

  if (validCollaborators.length > 0) {
    const collabsToInsert = validCollaborators.map((c) => ({
      event_id: createdEvent.id,
      user_id: c.user_id,
      role: c.role,
      invited_by: organizerUserId,
      status: 'pending' as const,
    }));
    const { error: collabError } = await supabase.from('event_collaborators').insert(collabsToInsert);
    if (collabError) throw new Error(collabError.message || "Erreur lors de l'invitation des collaborateurs");
  }

  return createdEvent;
}

// ==================== UPDATE EVENT FULL ====================

export interface UpdateEventPayload {
  title: string;
  description: string;
  category: EventCategory;
  subcategory?: string | null;
  location_name: string;
  location_address?: string | null;
  city: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  starts_at: string;
  ends_at?: string | null;
  price_min: number;
  cover_url: string;
  images?: string[];
  video_url?: string | null;
  capacity?: number | null;
  status?: EventStatus;
}

export async function updateEventFull(
  eventId: string,
  eventData: UpdateEventPayload,
  collaborators?: { user_id: string; role: 'co_organizer' | 'performer' }[],
  ticketOptions?: { id?: string; ticket_type: string; label: string; price: number; quantity_total: number; description?: string }[],
  organizerUserId?: string
): Promise<Event | null> {
  if (!eventId) throw new Error("ID d'événement manquant");
  if (!eventData.title.trim()) throw new Error('Le titre est obligatoire.');
  if (!eventData.starts_at) throw new Error("La date et l'heure sont obligatoires.");

  const safeCategory = normalizeEventCategory(eventData.category);

  let formattedDescription = eventData.description ? eventData.description.trim() : '';
  if (eventData.subcategory && !formattedDescription.includes(`[Sous-catégorie:`)) {
    formattedDescription = `[Sous-catégorie: ${eventData.subcategory}]\n${formattedDescription}`.trim();
  }

  const updateFields: Record<string, unknown> = {
    title: eventData.title.trim(),
    description: formattedDescription || null,
    category: safeCategory,
    location_name: eventData.location_name || 'Lieu à définir',
    location_address: eventData.location_address || null,
    city: eventData.city,
    country: eventData.country || 'TG',
    latitude: eventData.latitude ?? null,
    longitude: eventData.longitude ?? null,
    starts_at: new Date(eventData.starts_at).toISOString(),
    ends_at: eventData.ends_at ? new Date(eventData.ends_at).toISOString() : null,
    price_min: eventData.price_min,
    cover_url: eventData.cover_url || null,
    images: eventData.images || [],
    capacity: eventData.capacity || null,
    updated_at: new Date().toISOString(),
  };

  if (eventData.status) {
    updateFields.status = eventData.status;
  }

  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update(updateFields)
    .eq('id', eventId)
    .select()
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message || "Erreur lors de la mise à jour de l'événement");
  }

  // Handle video_url via event_live_links
  if (eventData.video_url && eventData.video_url.trim()) {
    try {
      const { data: existingLink } = await supabase
        .from('event_live_links')
        .select('id')
        .eq('event_id', eventId)
        .eq('platform', 'video')
        .maybeSingle();

      if (existingLink) {
        await supabase
          .from('event_live_links')
          .update({ url: eventData.video_url.trim() })
          .eq('id', existingLink.id);
      } else {
        await supabase
          .from('event_live_links')
          .insert({
            event_id: eventId,
            platform: 'video',
            url: eventData.video_url.trim(),
            title: 'Vidéo Teaser',
          });
      }
    } catch {
      // Non-blocking
    }
  }

  const updatedEvent = updated as Event | null;
  if (updatedEvent) {
    updatedEvent.subcategory = eventData.subcategory || null;
    updatedEvent.video_url = eventData.video_url || null;
  }

  // Sync ticket options if provided
  if (ticketOptions && Array.isArray(ticketOptions)) {
    const validTicketTypes = ['free', 'standard', 'vip', 'vvip'];
    const validTickets = ticketOptions.filter((t) => t.label.trim() && validTicketTypes.includes(t.ticket_type));

    // Handle updates and additions
    for (const opt of validTickets) {
      if (opt.id && !opt.id.startsWith('temp-') && !opt.id.startsWith('fallback-')) {
        await supabase
          .from('ticket_options')
          .update({
            ticket_type: opt.ticket_type,
            label: opt.label.trim(),
            price: opt.price,
            quantity_total: opt.quantity_total,
            description: opt.description || null,
          })
          .eq('id', opt.id);
      } else {
        await supabase.from('ticket_options').insert({
          event_id: eventId,
          ticket_type: opt.ticket_type,
          label: opt.label.trim(),
          price: opt.price,
          quantity_total: opt.quantity_total,
          description: opt.description || null,
        });
      }
    }
  }

  // Sync collaborators if provided
  if (collaborators && Array.isArray(collaborators) && organizerUserId) {
    const validCollabs = collaborators.filter((c) => c.user_id && c.user_id.trim());
    for (const c of validCollabs) {
      const { data: existing } = await supabase
        .from('event_collaborators')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', c.user_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('event_collaborators').insert({
          event_id: eventId,
          user_id: c.user_id,
          role: c.role,
          invited_by: organizerUserId,
          status: 'pending',
        });
      }
    }
  }

  return updated as Event | null;
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
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(organizationId) || !UUID_REGEX.test(userId)) {
    return true;
  }
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
  // Read local tickets to ensure offline/guest purchases are included in global totals
  const localTickets = getLocalStoredTickets();
  const localActiveTickets = localTickets.filter((t) => t.status !== 'cancelled');
  const localTicketCount = localActiveTickets.reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);
  const localRevenue = localActiveTickets.reduce((sum, t) => sum + (Number(t.price_paid) || 0), 0);

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
    // Active events only (not expired / terminated)
    const activeEvents = events.filter((e) => isEventActive(e) && !isEventTerminated(e));
    const tickets = ticketsRes.data || [];

    const totalEvents = activeEvents.length;
    const totalArtists = artistsCount.count ?? 0;
    const totalOrganizers = orgsCount.count ?? 0;
    
    // Aggregate global tickets bought across all users
    const dbTicketCount = tickets.reduce((sum: number, t: { quantity?: number }) => sum + (t.quantity || 1), 0);
    const dbRevenue = tickets.reduce((sum: number, t: { price_paid?: number }) => sum + (t.price_paid || 0), 0);

    const totalTickets = dbTicketCount + localTicketCount;
    const totalRevenue = dbRevenue + localRevenue;

    // Total registered users of the app
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
    const { data: tickets } = await supabase.from('tickets').select('price_paid, status').in('event_id', eventIds).neq('status', 'cancelled');
    baseStats.totalTickets = tickets?.length || 0;
    baseStats.totalRevenue = tickets?.reduce((s, t) => s + (t.price_paid || 0), 0) || 0;
    return baseStats;
  } catch {
    return defaultStats;
  }
}

export async function fetchArtistStats(artistId: string): Promise<{ totalEvents: number; totalFollowers: number; upcomingEvents: number; totalViews: number }> {
  const defaultStats = { totalEvents: 0, totalFollowers: 0, upcomingEvents: 0, totalViews: 0 };
  if (!isSupabaseConfigured || !artistId) return defaultStats;
  try {
    const { data: artistEvents } = await supabase.from('event_artists').select('event_id').eq('artist_id', artistId);
    const eventIds = (artistEvents || []).map((r: { event_id: string }) => r.event_id);
    const { count: followersCount } = await supabase.from('artist_follows').select('id', { count: 'exact', head: true }).eq('artist_id', artistId);
    if (eventIds.length === 0) {
      return { totalEvents: 0, totalFollowers: followersCount || 0, upcomingEvents: 0, totalViews: 0 };
    }
    const { data: rawEvents } = await supabase.from('events').select('views_count, starts_at, status, id, title').in('id', eventIds);
    const events = ((rawEvents || []) as Event[]).filter(isRealEvent);
    return {
      totalEvents: events.length,
      totalFollowers: followersCount || 0,
      upcomingEvents: events.filter((e) => e.status === 'published' && isEventActive(e)).length,
      totalViews: events.reduce((s, e) => s + (e.views_count || 0), 0),
    };
  } catch {
    return defaultStats;
  }
}

// ==================== EXISTING QUERIES ====================

export async function fetchFeaturedEvents(): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .limit(30);

    if (!error && data && data.length > 0) {
      const activeList = (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e));

      // Organic sorting score: combines featured status, attendance, views, and likes
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

export async function fetchEventsByCategory(category: EventCategory): Promise<Event[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .eq('category', category)
      .order('starts_at', { ascending: true })
      .limit(30);
    if (!error && data && data.length > 0) {
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e));
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
      .limit(20);
    if (!error && data && data.length > 0) {
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e)).slice(0, 8);
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
      .limit(30);
    if (!error && data && data.length > 0) {
      return (data as Event[]).filter((e) => isRealEvent(e) && isEventActive(e)).slice(0, 15);
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchEventById(id: string): Promise<EventWithRelations | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    // 1. Try fetching event with full relations
    const { data, error } = await supabase
      .from('events')
      .select(`*, event_artists ( artist:artists (*) ), organizer:organizations (*)`)
      .eq('id', id)
      .maybeSingle();

    if (!error && data && isRealEvent(data as Event)) {
      return data as EventWithRelations;
    }

    // 2. If relation join fails (e.g. no organizer), fetch event directly
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
  const sanitized = sanitizeFilterInput(query);
  if (!sanitized) return [];
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,location_name.ilike.%${sanitized}%,city.ilike.%${sanitized}%`)
      .order('starts_at', { ascending: true })
      .limit(30);
    if (error || !data) return [];
    return (data as Event[]).filter((e) => isRealEvent(e));
  } catch {
    return [];
  }
}

export async function fetchFeaturedArtists(): Promise<Artist[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const [artistsRes, profilesRes, eventsRes, followsRes] = await Promise.all([
      supabase.from('artists').select('*').limit(30),
      supabase.from('profiles').select('*').eq('role', 'artist').limit(30),
      supabase.from('events').select('id, organizer_user_id, status').eq('status', 'published'),
      supabase.from('artist_follows').select('artist_id'),
    ]);

    // Compute real event count per creator
    const eventsList = (eventsRes.data || []) as { organizer_user_id?: string }[];
    const eventCountByUser: Record<string, number> = {};
    eventsList.forEach((e) => {
      if (e.organizer_user_id) {
        eventCountByUser[e.organizer_user_id] = (eventCountByUser[e.organizer_user_id] || 0) + 1;
      }
    });

    // Compute real followers count per artist from artist_follows
    const followList = (followsRes.data || []) as { artist_id: string }[];
    const followersMap: Record<string, number> = {};
    followList.forEach((f) => {
      if (f.artist_id) {
        followersMap[f.artist_id] = (followersMap[f.artist_id] || 0) + 1;
      }
    });

    const artists = ((artistsRes.data || []) as Artist[])
      .filter(isRealArtist)
      .map((a) => ({
        ...a,
        followers_count: followersMap[a.id] || (a.user_id ? followersMap[a.user_id] : 0) || (a.followers_count || 0),
        events_count: a.user_id ? (eventCountByUser[a.user_id] || 0) : (eventCountByUser[a.id] || 0),
      }));

    const knownIds = new Set(artists.map((a) => a.id).concat(artists.map((a) => a.user_id || '').filter(Boolean)));
    const knownNames = new Set(artists.map((a) => (a.name || '').toLowerCase().trim()));

    const profileArtists: Artist[] = ((profilesRes.data || []) as Profile[])
      .filter((p) => p.name && !knownIds.has(p.id) && !knownNames.has(p.name.toLowerCase().trim()))
      .map((p) => ({
        id: p.id,
        user_id: p.id,
        name: p.name,
        bio: p.bio || 'Artiste de la communauté Gbaigbance',
        photo_url: p.avatar_url || null,
        cover_url: '',
        genres: ['Afrobeats', 'Live'],
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        followers_count: followersMap[p.id] || 0,
        events_count: eventCountByUser[p.id] || 0,
        is_verified: true,
        created_at: p.created_at || new Date().toISOString(),
      }));

    return [...artists, ...profileArtists];
  } catch {
    return [];
  }
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

    // Compute real events count per organization / organizer user
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

    // Compute real followers count from organization_follows
    const followList = (followsRes.data || []) as { organization_id: string }[];
    const followersMap: Record<string, number> = {};
    followList.forEach((f) => {
      if (f.organization_id) {
        followersMap[f.organization_id] = (followersMap[f.organization_id] || 0) + 1;
      }
    });

    const orgs = ((orgsRes.data || []) as Organization[])
      .filter(isRealOrganization)
      .map((o) => ({
        ...o,
        followers_count: followersMap[o.id] || (o.owner_id ? followersMap[o.owner_id] : 0) || (o.followers_count || 0),
        events_count: eventCountByOrg[o.id] || (o.owner_id ? eventCountByUser[o.owner_id] : 0) || 0,
      }));

    const knownIds = new Set(orgs.map((o) => o.id).concat(orgs.map((o) => o.owner_id || '').filter(Boolean)));
    const knownNames = new Set(orgs.map((o) => (o.name || '').toLowerCase().trim()));

    const profileOrgs: Organization[] = ((profilesRes.data || []) as Profile[])
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
      }));

    return [...orgs, ...profileOrgs];
  } catch {
    return [];
  }
}

export async function fetchArtistById(id: string): Promise<Artist | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const { count: realFollowersCount } = await supabase
      .from('artist_follows')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', id);

    const { data, error } = await supabase.from('artists').select('*').eq('id', id).maybeSingle();
    if (!error && data && isRealArtist(data as Artist)) {
      const art = data as Artist;
      return {
        ...art,
        followers_count: typeof realFollowersCount === 'number' ? realFollowersCount : (art.followers_count || 0),
      };
    }

    // Check in profiles if artist was registered as user account
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (p && p.role === 'artist') {
      const { count } = await supabase.from('events').select('id', { count: 'exact', head: true }).eq('organizer_user_id', id).eq('status', 'published');
      return {
        id: p.id,
        user_id: p.id,
        name: p.name,
        bio: p.bio || 'Artiste de la communauté Gbaigbance',
        photo_url: p.avatar_url || null,
        cover_url: '',
        genres: ['Afrobeats', 'Live'],
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        followers_count: typeof realFollowersCount === 'number' ? realFollowersCount : 0,
        events_count: count || 0,
        is_verified: true,
        created_at: p.created_at || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchEventsByArtist(artistId: string): Promise<Event[]> {
  if (!isSupabaseConfigured || !artistId) return [];
  try {
    const [byUser, byLink] = await Promise.all([
      supabase.from('events').select('*').eq('organizer_user_id', artistId).eq('status', 'published').order('starts_at', { ascending: false }),
      supabase.from('events').select(`*, event_artists!inner (artist_id)`).eq('event_artists.artist_id', artistId).eq('status', 'published').order('starts_at', { ascending: false })
    ]);

    const combined = [
      ...(((byUser.data as Event[]) || [])),
      ...(((byLink.data as unknown as Event[]) || []))
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

// ==================== TICKET VALIDATION (CHECK-IN) ====================

export async function validateTicketQr(qrCode: string, eventId: string): Promise<{ success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string }> {
  const { data, error } = await supabase.rpc('validate_ticket_qr', {
    p_qr_code: qrCode,
    p_event_id: eventId,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string };
}

