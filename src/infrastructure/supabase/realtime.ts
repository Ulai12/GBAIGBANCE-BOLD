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
    onEventUpdate?: (event: Partial<Event>) => void;
  }
) {
  if (!isSupabaseConfigured || !eventId) return () => {};

  const channel = supabase
    .channel(`realtime:event:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`,
      },
      (payload) => {
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
    supabase.removeChannel(channel);
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

  const channel = supabase
    .channel(`realtime:inventory:${eventId}`)
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
    supabase.removeChannel(channel);
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
    .channel(`realtime:user_tickets:${userId}`)
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
 * Subscribes to live changes on the entire public.events table (INSERT, UPDATE, DELETE).
 * Provides instantaneous real-time sync across clients without requiring manual page refresh.
 */
export function subscribeToGlobalEventsLive(onEventChange: (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => void) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('realtime:global_events_feed')
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
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

