import { supabase } from '@/services/supabase';
import type { Event, EventCategory, EventStatus } from '@/types';
import { injectCategoryMeta, hydrateEventCategories } from '@/constants/categories';

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

// ==================== CREATE EVENT WITH COLLABORATORS ====================

export async function createEventWithCollaborators(
  eventData: {
    title: string;
    description: string;
    category: EventCategory;
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
    subcategory?: string | null;
    main_category?: string | null;
  },
  collaborators: { user_id: string; role: 'co_organizer' | 'performer' }[],
  ticketOptions: { ticket_type: string; label: string; price: number; quantity_total: number; description?: string }[],
  organizerUserId: string
): Promise<Event | null> {
  if (!organizerUserId) throw new Error('Utilisateur non identifié. Reconnectez-vous.');
  if (!eventData.title.trim()) throw new Error('Le titre est obligatoire.');
  if (!eventData.starts_at) throw new Error("La date et l'heure sont obligatoires.");
  const validCollaborators = collaborators.filter((c) => c.user_id && c.user_id.trim());
  const validTicketTypes = ['free', 'standard', 'vip', 'vvip'];
  const validTickets = ticketOptions.filter((t) => t.label.trim() && validTicketTypes.includes(t.ticket_type));
  const finalDescription = injectCategoryMeta(eventData.description, eventData.subcategory, eventData.main_category);
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: eventData.title.trim(),
      description: finalDescription || null,
      category: eventData.category,
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
      video_url: eventData.video_url || null,
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
  return createdEvent ? hydrateEventCategories(createdEvent) : null;
}

// ==================== UPDATE EVENT FULL ====================

export interface UpdateEventPayload {
  title: string;
  description: string;
  category: EventCategory;
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

  const updateFields: Record<string, unknown> = {
    title: eventData.title.trim(),
    description: eventData.description || null,
    category: eventData.category,
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
    video_url: eventData.video_url || null,
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

  // Sync ticket options if provided
  if (ticketOptions && Array.isArray(ticketOptions)) {
    const validTicketTypes = ['free', 'standard', 'vip', 'vvip'];
    const validTickets = ticketOptions.filter((t) => t.label.trim() && validTicketTypes.includes(t.ticket_type));

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

// ==================== DELETE & CANCEL EVENT ====================

export async function fetchEventDeletionInfo(
  eventId: string
): Promise<{ ticketsCount: number; collaboratorsCount: number; ticketOptionsCount: number; likesCount: number }> {
  const [tickets, collabs, options, likes] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).neq('status', 'cancelled'),
    supabase.from('event_collaborators').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('ticket_options').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_likes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);
  return {
    ticketsCount: tickets.count || 0,
    collaboratorsCount: collabs.count || 0,
    ticketOptionsCount: options.count || 0,
    likesCount: likes.count || 0,
  };
}

export async function cancelEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
  if (error) throw new Error(error.message || "Erreur lors de l'annulation");
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw new Error(error.message || 'Erreur lors de la suppression');
}
