/**
 * GBAIGBANCE Infrastructure - Analytics & Telemetry
 */

import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

export async function trackEvent(eventName: string, properties?: Record<string, unknown>): Promise<void> {
  const event: AnalyticsEvent = {
    name: eventName,
    properties,
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV === 'development') {
    // Development local telemetry
    console.debug('[Analytics]', event.name, event.properties);
  }

  // Record specific high-value metrics if Supabase configured
  if (isSupabaseConfigured && eventName === 'event_view' && properties?.eventId) {
    try {
      await supabase.rpc('increment_event_views', { p_event_id: properties.eventId as string });
    } catch {
      // Telemetry should never throw to userland
    }
  }
}
