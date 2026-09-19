import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './client';
import type { Event, Ticket, TicketOption } from '@/types';

/**
 * GBAIGBANCE Infrastructure - Realtime Subscriptions Manager
 * 
 * Manages reactive Supabase postgres_changes channels for:
 * - Live event status updates (status, published, cancelled, views, attendees)
 * - Live ticket inventory & availability (quantity_sold, remaining spots)
 * - Live user ticket state updates (ticket booked, validated at the gate, cancelled)
 */

export interface EventRealtimePayload {
  id: string;
  status?: string;
  attendees_count?: number;
  views_count?: number;
  price_min?: number;
  title?: string;
  updated_at?: string;
}

/**
 * Subscribes to live changes on a specific event document.
 */
export function subscribeToEventLive(
  eventId: string,
  callbacks: {
    onStatusChange?: (status: string, event: Partial<Event>) => void;
    onAttendeesChange?: (attendeesCount: number) => void;
    onViewsChange?: (viewsCount: number) => void;
    onLikesChange?: (likesCount: number) => void;
    onEventUpdate?: (event: Partial<Event>) => void;
    onEventDelete?: () => void;
  }
) {
  if (!isSupabaseConfigured || !eventId) return () => {};

  const channelId = `realtime:event:${eventId}:${Math.random().toString(36).substring(2, 8)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          if (callbacks.onEventDelete) callbacks.onEventDelete();
          if (callbacks.onStatusChange) callbacks.onStatusChange('deleted', { id: eventId } as Partial<Event>);
          return;
        }

        const updated = payload.new as EventRealtimePayload;
        if (!updated) return;

        if (callbacks.onEventUpdate) {
          callbacks.onEventUpdate(updated as unknown as Partial<Event>);
        }
        if (updated.status && callbacks.onStatusChange) {
          callbacks.onStatusChange(updated.status, updated as unknown as Partial<Event>);
        }
        if (typeof updated.attendees_count === 'number' && callbacks.onAttendeesChange) {
          callbacks.onAttendeesChange(updated.attendees_count);
        }
        if (typeof updated.views_count === 'number' && callbacks.onViewsChange) {
          callbacks.onViewsChange(updated.views_count);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Safe cleanup
    }
  };
}

/**
 * Subscribes to live ticket inventory changes for an event.
 */
export function subscribeToTicketInventory(
  eventId: string,
  onUpdate: (option: TicketOption) => void
) {
  if (!isSupabaseConfigured || !eventId) return () => {};

  const channelId = `realtime:inventory:${eventId}:${Math.random().toString(36).substring(2, 8)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ticket_options',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as TicketOption);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Safe cleanup
    }
  };
}

/**
 * Subscribes to live ticket updates for a user (e.g. ticket scanned at gate).
 */
export function subscribeToUserTicketsLive(
  userId: string,
  callbacks: {
    onTicketCreated?: (ticket: Ticket) => void;
    onTicketUpdated?: (ticket: Ticket) => void;
    onTicketCancelled?: (ticketId: string) => void;
  }
) {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel = supabase
    .channel(`realtime:user_tickets:${userId}:${Math.random().toString(36).substring(2, 8)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && callbacks.onTicketCreated) {
          callbacks.onTicketCreated(payload.new as Ticket);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as Ticket;
        if (!updated) return;
        if (updated.status === 'cancelled' && callbacks.onTicketCancelled) {
          callbacks.onTicketCancelled(updated.id);
        } else if (callbacks.onTicketUpdated) {
          callbacks.onTicketUpdated(updated);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==================== REACT HOOKS ====================

/**
 * Hook to automatically subscribe to real-time event updates with automatic cleanup.
 */
export function useRealtimeEvent(
  eventId: string | undefined,
  onUpdate: (event: Partial<Event>) => void
) {
  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = subscribeToEventLive(eventId, {
      onEventUpdate: onUpdate,
    });
    return () => {
      unsubscribe();
    };
  }, [eventId, onUpdate]);
}

/**
 * Hook to automatically subscribe to real-time ticket options inventory.
 */
export function useRealtimeInventory(
  eventId: string | undefined,
  onOptionUpdate: (option: TicketOption) => void
) {
  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = subscribeToTicketInventory(eventId, onOptionUpdate);
    return () => {
      unsubscribe();
    };
  }, [eventId, onOptionUpdate]);
}

/**
 * Hook to automatically subscribe to real-time user ticket state changes.
 */
export function useRealtimeUserTickets(
  userId: string | undefined,
  onTicketsChanged: () => void
) {
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToUserTicketsLive(userId, {
      onTicketCreated: () => onTicketsChanged(),
      onTicketUpdated: () => onTicketsChanged(),
      onTicketCancelled: () => onTicketsChanged(),
    });
    return () => {
      unsubscribe();
    };
  }, [userId, onTicketsChanged]);
}

/**
 * Subscribes to live changes on user favorites (event_likes) and followings (artist_follows, organization_follows).
 * Synchronizes likes and subscriptions instantaneously across components and devices without manual refresh.
 */
export function subscribeToUserFavoritesLive(
  userId: string,
  callbacks: {
    onLikeChange?: (payload: { eventType: string; eventId: string }) => void;
    onArtistFollowChange?: (payload: { eventType: string; artistId: string }) => void;
    onOrgFollowChange?: (payload: { eventType: string; orgId: string }) => void;
  }
) {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channelId = `realtime:favorites:${userId}:${Math.random().toString(36).substring(2, 8)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_likes',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const record = (payload.new || payload.old) as { event_id?: string } | undefined;
        if (record?.event_id && callbacks.onLikeChange) {
          callbacks.onLikeChange({
            eventType: payload.eventType,
            eventId: record.event_id,
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'artist_follows',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const record = (payload.new || payload.old) as { artist_id?: string } | undefined;
        if (record?.artist_id && callbacks.onArtistFollowChange) {
          callbacks.onArtistFollowChange({
            eventType: payload.eventType,
            artistId: record.artist_id,
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'organization_follows',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const record = (payload.new || payload.old) as { organization_id?: string } | undefined;
        if (record?.organization_id && callbacks.onOrgFollowChange) {
          callbacks.onOrgFollowChange({
            eventType: payload.eventType,
            orgId: record.organization_id,
          });
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Safe cleanup
    }
  };
}

/**
 * Subscribes to live changes on the entire public.events table (INSERT, UPDATE, DELETE).
 * Provides instantaneous real-time sync across clients without requiring manual page refresh.
 */
export function subscribeToGlobalEventsLive(
  onEventChange: (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => void
) {
  if (!isSupabaseConfigured) return () => {};

  const channelId = `realtime:global_events_feed:${Math.random().toString(36).substring(2, 8)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
      },
      (payload) => {
        onEventChange({
          eventType: payload.eventType,
          new: payload.new as Record<string, unknown> | undefined,
          old: payload.old as Record<string, unknown> | undefined,
        });
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Safe cleanup
    }
  };
}

