import type { Event, Artist, Organization, TicketOption, EventWithRelations } from '@/types';

/**
 * All mock data has been completely removed.
 * Data is fetched in real-time directly from Supabase.
 */
export const MOCK_ORGANIZATIONS: Organization[] = [];
export const MOCK_ARTISTS: Artist[] = [];
export const MOCK_EVENTS: Event[] = [];
export const MOCK_TICKETS: TicketOption[] = [];

export function getMockEventWithRelations(_eventId: string): EventWithRelations | null {
  return null;
}
