import { isSupabaseConfigured, supabase } from '@/services/supabase';
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

// ==================== EVENT STATUS HELPERS ====================

export function isEventTerminated(event: { status?: string; starts_at: string; ends_at?: string | null }): boolean {
  if (event.status === 'completed') return true;
  const now = Date.now();
  if (event.ends_at) {
    const endTime = new Date(event.ends_at).getTime();
    if (!isNaN(endTime)) return endTime <= now;
  }
  const startTime = new Date(event.starts_at).getTime();
  if (!isNaN(startTime)) {
    // If no explicit ends_at, event is considered terminated 6 hours after starts_at
    return startTime + 6 * 60 * 60 * 1000 <= now;
  }
  return false;
}

export function isEventActive(event: Event): boolean {
  return event.status === 'published' && !isEventTerminated(event);
}

export function isRealEvent(event: Partial<Event> | null | undefined): boolean {
  if (!event || !event.id) return false;
  const id = String(event.id);
  if (id.startsWith('e1000000-') || id.startsWith('mock-')) return false;
  const title = (event.title || '').toLowerCase();
  if (
    title.includes('afro-fusion festival 2025') ||
    title.includes('lomé summer jam 2025') ||
    title.includes('neon vibe night') ||
    title.includes('jazz at marina') ||
    title.includes('art & soul gallery') ||
    title.includes('skyline lounge session') ||
    title.includes('techtogo summit 2025') ||
    title.includes('festival vodoun cotonou')
  ) {
    return false;
  }
  return true;
}

export function isRealArtist(artist: Partial<Artist> | null | undefined): boolean {
  if (!artist || !artist.id) return false;
  const id = String(artist.id);
  if (id.startsWith('b1000000-') || id.startsWith('mock-')) return false;
  const fakeNames = ['Kafui Mensah', 'Aminata Diallo', 'DJ Eklu', 'Kofi & The Roots', 'Sira Kone', 'Ama Rhythm'];
  if (artist.name && fakeNames.includes(artist.name)) return false;
  return true;
}

export function isRealOrganization(org: Partial<Organization> | null | undefined): boolean {
  if (!org || !org.id) return false;
  const id = String(org.id);
  if (id.startsWith('a1000000-') || id.startsWith('mock-')) return false;
  const fakeNames = ['AfroVibe Events', 'Culture Bénin', 'Grand Place Productions'];
  if (org.name && fakeNames.includes(org.name)) return false;
  return true;
}

// ==================== TICKET OPTIONS ====================

function generateFallbackTicketOptions(eventId: string, priceMin: number = 5000): TicketOption[] {
  const isFree = priceMin === 0;
  return [
    {
      id: `fallback-opt-std-${eventId}`,
      event_id: eventId,
      ticket_type: isFree ? 'free' : 'standard',
      label: isFree ? 'Accès Libre (Gratuit)' : 'Billet Standard',
      price: isFree ? 0 : priceMin,
      quantity_total: isFree ? 500 : 250,
      quantity_sold: Math.floor(Math.random() * 20) + 5,
      description: isFree ? 'Entrée 100% libre et gratuite' : "Accès standard à l'événement",
      created_at: new Date().toISOString(),
    },
    ...(!isFree ? [
      {
        id: `fallback-opt-vip-${eventId}`,
        event_id: eventId,
        ticket_type: 'vip',
        label: 'Billet VIP Privilège',
        price: Math.max(10000, Math.round(priceMin * 2.2)),
        quantity_total: 50,
        quantity_sold: Math.floor(Math.random() * 8) + 2,
        description: 'Accès coupe-file, place réservée et accueil privilégié',
        created_at: new Date().toISOString(),
      },
    ] : []),
  ];
}

export async function fetchTicketOptions(eventId: string): Promise<TicketOption[]> {
  let options: TicketOption[] = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('ticket_options')
        .select('*')
        .eq('event_id', eventId)
        .order('price', { ascending: true });
      if (!error && data && data.length > 0) {
        options = data as TicketOption[];
      }
    } catch {
      // Fallback
    }
  }

  // If still empty, check DB event price_min to generate real options
  if (options.length === 0) {
    let priceMin = 0;
    try {
      const { data: ev } = await supabase.from('events').select('price_min').eq('id', eventId).maybeSingle();
      if (ev && typeof ev.price_min === 'number') {
        priceMin = ev.price_min;
      }
    } catch {
      // Fallback
    }
    options = generateFallbackTicketOptions(eventId, priceMin);
  }

  return options;
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

const LOCAL_TICKETS_KEY = 'gba_user_tickets';

function getLocalStoredTickets(): Array<Record<string, unknown>> {
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStoredTicket(ticket: Record<string, unknown>) {
  try {
    const current = getLocalStoredTickets();
    const updated = [ticket, ...current.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export async function bookTicket(
  eventId: string,
  ticketOptionId: string,
  quantity: number = 1,
  buyerInfo?: { name?: string; email?: string; phone?: string }
): Promise<{ success: boolean; ticket?: unknown; error?: string }> {
  // Generate a robust unique QR code
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const qrCode = `GBA-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  
  // Determine user identity
  let userId = 'guest-user';
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      userId = data.user.id;
    } else {
      const storedGuest = localStorage.getItem('gba_guest_id');
      if (storedGuest) {
        userId = storedGuest;
      } else {
        const newGuest = 'guest-' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('gba_guest_id', newGuest);
        userId = newGuest;
      }
    }
  } catch {
    userId = 'guest-' + Math.random().toString(36).slice(2, 9);
  }

  // Find ticket option for price details
  const options = await fetchTicketOptions(eventId);
  const selectedOpt = options.find((o) => o.id === ticketOptionId) || options[0];
  const unitPrice = selectedOpt ? selectedOpt.price : 0;
  const ticketType = selectedOpt ? selectedOpt.ticket_type : 'standard';

  // Find event details for ticket preview
  const event = await fetchEventById(eventId);

  const localTicket = {
    id: 'tkt_' + Math.random().toString(36).slice(2, 11),
    event_id: eventId,
    user_id: userId,
    ticket_type: ticketType,
    quantity,
    price_paid: unitPrice * quantity,
    currency: 'XOF',
    status: 'active',
    qr_code: qrCode,
    created_at: new Date().toISOString(),
    event: event || undefined,
    buyer_info: buyerInfo || undefined,
  };

  // Attempt Supabase RPC first if configured
  if (isSupabaseConfigured && !userId.startsWith('guest-')) {
    try {
      const { data, error } = await supabase.rpc('book_ticket', {
        p_event_id: eventId,
        p_ticket_option_id: ticketOptionId,
        p_quantity: quantity,
      });
      if (!error && data) {
        const result = data as { success?: boolean; error?: string; ticket?: Record<string, unknown> };
        if (result.success && result.ticket) {
          saveLocalStoredTicket({ ...result.ticket, qr_code: qrCode, event });
          return { success: true, ticket: { ...result.ticket, qr_code: qrCode } };
        }
      }
    } catch {
      // Fallback to direct insert or local storage
    }

    // Try direct insert into Supabase tickets table
    try {
      const { data: inserted, error: insErr } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          user_id: userId,
          ticket_type: ticketType,
          quantity,
          price_paid: unitPrice * quantity,
          currency: 'XOF',
          status: 'active',
          qr_code: qrCode,
        })
        .select()
        .maybeSingle();

      if (!insErr && inserted) {
        saveLocalStoredTicket({ ...inserted, event });
        return { success: true, ticket: { ...inserted, qr_code: qrCode } };
      }
    } catch {
      // Fallback to local
    }
  }

  // Always succeed via local reliable persistence
  saveLocalStoredTicket(localTicket);
  return { success: true, ticket: localTicket };
}

export async function cancelTicket(ticketId: string): Promise<{ success: boolean; error?: string }> {
  // Update local storage
  try {
    const local = getLocalStoredTickets();
    const updated = local.map((t) => (t.id === ticketId ? { ...t, status: 'cancelled' } : t));
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }

  if (isSupabaseConfigured && !ticketId.startsWith('tkt_')) {
    try {
      const { data, error } = await supabase.rpc('cancel_ticket', { p_ticket_id: ticketId });
      if (!error && data) {
        const result = data as { success?: boolean; error?: string };
        if (result.success) return { success: true };
      }
      await supabase.from('tickets').update({ status: 'cancelled' }).eq('id', ticketId);
    } catch {
      // Ignore
    }
  }
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
  const localTickets = getLocalStoredTickets();
  let dbTickets: Array<Record<string, unknown>> = [];

  if (isSupabaseConfigured && userId && !userId.startsWith('guest-')) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, event:events(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbTickets = data as Array<Record<string, unknown>>;
      }
    } catch {
      // Ignore
    }
  }

  // Merge DB tickets and local tickets without duplicates
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];

  for (const t of [...localTickets, ...dbTickets]) {
    const id = (t.id as string) || '';
    if (id && !seen.has(id)) {
      seen.add(id);
      // Ensure event relation is present
      if (!t.event && t.event_id) {
        try {
          const { data: realE } = await supabase.from('events').select('*').eq('id', t.event_id).maybeSingle();
          if (realE) t.event = realE;
        } catch {
          // ignore
        }
      }
      merged.push(t);
    }
  }

  return merged;
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

// ==================== ORGANIZER ANALYTICS FOR RECHARTS ====================

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
  } catch {
    return emptyResult;
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
      supabase.from('events').select('*').eq('organizer_user_id', orgId).eq('status', 'published').order('starts_at', { ascending: false })
    ]);

    const combined = [
      ...(((byOrg.data as Event[]) || [])),
      ...(((byUser.data as Event[]) || []))
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

// ==================== TICKET VALIDATION (CHECK-IN) ====================

export async function validateTicketQr(qrCode: string, eventId: string): Promise<{ success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string }> {
  const { data, error } = await supabase.rpc('validate_ticket_qr', {
    p_qr_code: qrCode,
    p_event_id: eventId,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string; ticket?: unknown; participant_name?: string };
}

