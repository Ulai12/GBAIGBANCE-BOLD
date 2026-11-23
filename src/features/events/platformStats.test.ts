import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePlatformStats } from './platformStats.ts';

function legacyStats() {
  return {
    isAvailable: true,
    totalEvents: 3,
    totalAllEvents: 4,
    totalArtists: 2,
    totalOrganizers: 1,
    totalTickets: 1,
    totalParticipants: 1,
    totalParticipantAccounts: 1,
    totalProfiles: 4,
    totalPendingPlatformInvitations: 0,
    totalUsers: 4,
    totalViews: 20,
    totalRevenue: 0,
    totalCancelledTickets: 0,
    totalRefundedTickets: 0,
    categories: { concert: 3 },
    categoryBasis: 'events',
    categoryShares: [{ id: 'concert', count: 3, amount: 0, percent: 100 }],
    ticketsTimeline: [{
      id: 'ticket-1',
      created_at: '2026-11-20T08:00:00.000Z',
      created_at_ms: 1795161600000,
      price_paid: 0,
    }],
    eventsTimeline: [{
      id: 'event-1',
      starts_at_ms: 1795161600000,
      attendees: 1,
    }],
    viewsTimeline: [],
    accountsTimeline: [],
  };
}

describe('parsePlatformStats', () => {
  it('adapts the currently deployed legacy RPC response', () => {
    const stats = parsePlatformStats(legacyStats());

    assert.equal(stats?.analyticsVersion, 2);
    assert.equal(stats?.totalEvents, 3);
    assert.equal(stats?.ticketsTimeline?.[0].quantity, 1);
    assert.equal(stats?.isAvailable, true);
  });

  it('keeps strict validation for explicitly versioned payloads', () => {
    const malformed = {
      ...legacyStats(),
      analyticsVersion: 2,
    };

    assert.equal(parsePlatformStats(malformed), null);
    assert.equal(parsePlatformStats({ ...legacyStats(), isAvailable: false }), null);
  });
});
