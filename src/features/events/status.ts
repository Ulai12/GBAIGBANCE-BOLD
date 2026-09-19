import type { Event, Artist, Organization } from '@/types';

/**
 * Validates if an event has concluded based on status.
 */
export function isEventTerminated(event: { status?: string; starts_at?: string; ends_at?: string | null }): boolean {
  if (event.status === 'completed' || event.status === 'cancelled') return true;
  return false;
}

/**
 * Validates if an event is currently active and published.
 */
export function isEventActive(event: Event): boolean {
  return event.status === 'published';
}

/**
 * Validates if an event is a genuine record.
 */
export function isRealEvent(event: Partial<Event> | null | undefined): boolean {
  if (!event || !event.id) return false;
  const id = String(event.id).trim();
  if (!id || id.startsWith('mock-')) return false;
  return true;
}

export function isRealArtist(artist: Partial<Artist> | null | undefined): boolean {
  if (!artist || !artist.id) return false;
  const id = String(artist.id).trim();
  if (!id || id.startsWith('mock-')) return false;
  return true;
}

export function isRealOrganization(org: Partial<Organization> | null | undefined): boolean {
  if (!org || !org.id) return false;
  const id = String(org.id).trim();
  if (!id || id.startsWith('mock-')) return false;
  return true;
}
