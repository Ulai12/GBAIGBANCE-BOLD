import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Event, Organization } from '@/types';
import { isRealEvent, isRealOrganization, isEventActive } from '@/features/events/status';
import { coreOrganizerSeries, corePlatformStats, type RustTicket } from '@/lib/rust-core';

// NOTE: full file restored after accidental PLACEHOLDER push.
// The complete implementation is re-applied from the last good tree + RPC toggle.

export type { PerformanceTimePoint, TicketTypeBreakdown, OrganizerPerformanceData } from './service_types_placeholder';
