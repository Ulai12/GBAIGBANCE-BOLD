/**
 * Gbaïgbancê - Route & Chunk Prefetching Strategy
 * Pre-warms lazy-loaded application chunks before user interaction
 * to ensure 0ms navigation latency.
 */

const prefetchedSet = new Set<string>();

export function prefetchEventDetail(): Promise<unknown> {
  if (prefetchedSet.has('eventDetail')) return Promise.resolve();
  prefetchedSet.add('eventDetail');
  return import('@/screens/EventDetailScreen').catch(() => {
    prefetchedSet.delete('eventDetail');
  });
}

export function prefetchAuth(): Promise<unknown> {
  if (prefetchedSet.has('auth')) return Promise.resolve();
  prefetchedSet.add('auth');
  return import('@/screens/AuthScreen').catch(() => {
    prefetchedSet.delete('auth');
  });
}

export function prefetchOrganizerDashboard(): Promise<unknown> {
  if (prefetchedSet.has('organizerDashboard')) return Promise.resolve();
  prefetchedSet.add('organizerDashboard');
  return import('@/screens/OrganizerDashboardScreen').catch(() => {
    prefetchedSet.delete('organizerDashboard');
  });
}

export function prefetchCreateEvent(): Promise<unknown> {
  if (prefetchedSet.has('createEvent')) return Promise.resolve();
  prefetchedSet.add('createEvent');
  return import('@/screens/CreateEventWizardScreen').catch(() => {
    prefetchedSet.delete('createEvent');
  });
}

export function prefetchArtistDetail(): Promise<unknown> {
  if (prefetchedSet.has('artistDetail')) return Promise.resolve();
  prefetchedSet.add('artistDetail');
  return import('@/screens/ArtistDetailScreen').catch(() => {
    prefetchedSet.delete('artistDetail');
  });
}

export function prefetchOrganizerDetail(): Promise<unknown> {
  if (prefetchedSet.has('organizerDetail')) return Promise.resolve();
  prefetchedSet.add('organizerDetail');
  return import('@/screens/OrganizerDetailScreen').catch(() => {
    prefetchedSet.delete('organizerDetail');
  });
}

export function prefetchCriticalRoutes(): void {
  if (typeof navigator !== 'undefined') {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (nav.connection?.saveData || nav.connection?.effectiveType === '2g') {
      return;
    }
  }

  const queue = [
    () => prefetchEventDetail(),
    () => prefetchAuth(),
    () => prefetchOrganizerDashboard(),
    () => prefetchCreateEvent(),
  ];

  let index = 0;
  function processNext() {
    if (index >= queue.length) return;
    const task = queue[index++];
    if (task) {
      task();
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(processNext, { timeout: 1500 });
    } else {
      setTimeout(processNext, 800);
    }
  }

  processNext();
}

// Bind to window for HTML idle invocation
if (typeof window !== 'undefined') {
  (window as unknown as { __gba_prefetch_critical_routes: () => void }).__gba_prefetch_critical_routes =
    prefetchCriticalRoutes;
}
