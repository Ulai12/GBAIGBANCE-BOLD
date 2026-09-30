import type { Event, Artist, Organization } from '@/types';

/**
 * Validates if an event has concluded based on status (completed/cancelled) or concluded date.
 */
export function isEventTerminated(event: { status?: string; starts_at?: string; ends_at?: string | null } | null | undefined): boolean {
  if (!event) return true;
  if (event.status === 'completed' || event.status === 'cancelled') return true;

  const now = Date.now();

  // If ends_at is defined, use it to accurately determine if event has concluded
  if (event.ends_at) {
    const endMs = new Date(event.ends_at).getTime();
    if (!Number.isNaN(endMs)) {
      return endMs < now;
    }
  }

  // If ends_at is not provided, check starts_at with a standard 6h duration window
  if (event.starts_at) {
    const startMs = new Date(event.starts_at).getTime();
    if (!Number.isNaN(startMs)) {
      const defaultDurationMs = 6 * 60 * 60 * 1000;
      return (startMs + defaultDurationMs) < now;
    }
  }

  return false;
}

/**
 * Checks if an event's calendar date has concluded in real time.
 */
export function hasEventEnded(event: { status?: string; starts_at?: string; ends_at?: string | null } | null | undefined): boolean {
  return isEventTerminated(event);
}

/**
 * Validates if an event is currently active, published, and viewable by guests and users.
 */
export function isEventActive(event: Event | null | undefined): boolean {
  if (!event) return false;
  return event.status === 'published' && !isEventTerminated(event);
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

/**
 * Validates if a user/participant profile is genuine and strictly excludes mock or test profiles.
 */
export function isRealProfile<T extends { id?: string | null; name?: string | null; email?: string | null }>(
  profile: T | null | undefined
): profile is T {
  if (!profile || !profile.id) return false;
  const id = String(profile.id).trim().toLowerCase();
  const name = String(profile.name || '').trim().toLowerCase();
  const email = String(profile.email || '').trim().toLowerCase();

  // Test UUIDs / mock IDs
  if (
    id.startsWith('mock-') ||
    id.startsWith('test-') ||
    id === 'd0ebe334-ba93-413e-a64e-fb2787bcafaa'
  ) {
    return false;
  }

  // Test names
  if (
    name === 'test user' ||
    name === 'test' ||
    name === 'fake user' ||
    name === 'demo user' ||
    name === 'utilisateur test' ||
    name.startsWith('test ') ||
    name.startsWith('fake ')
  ) {
    return false;
  }

  // Test emails
  if (
    email.includes('testuser@') ||
    email.includes('example.com') ||
    email.includes('test@') ||
    email === 'test@gbaigbance.com'
  ) {
    return false;
  }

  return true;
}

