export interface PlatformStats {
  analyticsVersion?: number;
  totalEvents: number;
  totalAllEvents?: number;
  totalArtists: number;
  totalOrganizers: number;
  totalTickets: number;
  totalParticipants: number;
  totalParticipantAccounts?: number;
  totalProfiles?: number;
  totalPendingPlatformInvitations?: number;
  totalUsers: number;
  totalViews: number;
  totalRevenue: number;
  totalCancelledTickets?: number;
  totalRefundedTickets?: number;
  categories: Record<string, number>;
  categoryBasis: 'revenue' | 'events';
  categoryShares: Array<{ id: string; count: number; amount: number; percent: number }>;
  ticketsTimeline?: Array<{
    id: string;
    created_at: string;
    created_at_ms: number;
    price_paid: number;
    quantity: number;
  }>;
  isAvailable?: boolean;
  eventsTimeline: Array<{
    id: string;
    starts_at_ms: number;
    attendees: number;
  }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Accept the currently deployed analytics RPC shape as well as version 2.
 * The legacy RPC omitted analyticsVersion and ticket quantity; each legacy
 * timeline row represented one ticket, so its quantity is safely one.
 */
export function parsePlatformStats(value: unknown): PlatformStats | null {
  const raw = asRecord(value);
  const isLegacy = raw?.analyticsVersion === undefined;
  if (!raw || raw.isAvailable !== true || (!isLegacy && raw.analyticsVersion !== 2)) return null;

  const numberFields = [
    'totalEvents',
    'totalAllEvents',
    'totalArtists',
    'totalOrganizers',
    'totalTickets',
    'totalParticipants',
    'totalParticipantAccounts',
    'totalProfiles',
    'totalPendingPlatformInvitations',
    'totalUsers',
    'totalViews',
    'totalRevenue',
    'totalCancelledTickets',
    'totalRefundedTickets',
  ] as const;
  const numbers = {} as Record<(typeof numberFields)[number], number>;
  for (const field of numberFields) {
    const parsed = nonNegativeNumber(raw[field]);
    if (parsed === null) return null;
    numbers[field] = parsed;
  }

  if (raw.categoryBasis !== 'revenue' && raw.categoryBasis !== 'events') return null;
  const rawCategories = asRecord(raw.categories);
  if (!rawCategories || !Array.isArray(raw.categoryShares)) return null;

  const categories: Record<string, number> = {};
  for (const [id, count] of Object.entries(rawCategories)) {
    const parsed = nonNegativeNumber(count);
    if (parsed === null) return null;
    categories[id] = parsed;
  }

  const categoryShares: PlatformStats['categoryShares'] = [];
  for (const item of raw.categoryShares) {
    const share = asRecord(item);
    const count = nonNegativeNumber(share?.count);
    const amount = nonNegativeNumber(share?.amount);
    const percent = nonNegativeNumber(share?.percent);
    if (!share || typeof share.id !== 'string' || count === null || amount === null || percent === null) {
      return null;
    }
    categoryShares.push({ id: share.id, count, amount, percent });
  }

  if (!Array.isArray(raw.ticketsTimeline) || !Array.isArray(raw.eventsTimeline)) return null;
  const ticketsTimeline: NonNullable<PlatformStats['ticketsTimeline']> = [];
  for (const item of raw.ticketsTimeline) {
    const ticket = asRecord(item);
    const createdAtMs = nonNegativeNumber(ticket?.created_at_ms);
    const pricePaid = nonNegativeNumber(ticket?.price_paid);
    const quantity = ticket?.quantity === undefined && isLegacy
      ? 1
      : nonNegativeNumber(ticket?.quantity);
    if (
      !ticket ||
      typeof ticket.id !== 'string' ||
      typeof ticket.created_at !== 'string' ||
      createdAtMs === null ||
      pricePaid === null ||
      quantity === null
    ) {
      return null;
    }
    ticketsTimeline.push({
      id: ticket.id,
      created_at: ticket.created_at,
      created_at_ms: createdAtMs,
      price_paid: pricePaid,
      quantity,
    });
  }

  const eventsTimeline: PlatformStats['eventsTimeline'] = [];
  for (const item of raw.eventsTimeline) {
    const event = asRecord(item);
    const startsAtMs = nonNegativeNumber(event?.starts_at_ms);
    const attendees = nonNegativeNumber(event?.attendees);
    if (!event || typeof event.id !== 'string' || startsAtMs === null || attendees === null) return null;
    eventsTimeline.push({ id: event.id, starts_at_ms: startsAtMs, attendees });
  }

  return {
    analyticsVersion: 2,
    ...numbers,
    categories,
    categoryBasis: raw.categoryBasis,
    categoryShares,
    ticketsTimeline,
    eventsTimeline,
    isAvailable: true,
  };
}
