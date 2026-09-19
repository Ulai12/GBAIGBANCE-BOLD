/**
 * GBAIGBANCE - Events Domain Facade
 * 
 * Provides a unified, backward-compatible API interface while delegating
 * business logic to modular, Domain-Driven Design (DDD) feature modules:
 * - @/features/events: Discovery, lifecycle, collaborators, interactions, mutations, queries
 * - @/features/tickets: Ticketing, reservation, QR validation, status
 * - @/features/artists: Artist profiles, discovery, follows, stats
 * - @/features/organizers: Organizations, metrics, analytics, follows
 * - @/features/notifications: In-app notifications & user preferences
 * - @/features/users: Social graph, profile lookup, user follows
 */

export function sanitizeFilterInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// ==================== EVENTS DOMAIN ====================
export {
  isEventTerminated,
  isEventActive,
  isRealEvent,
  isRealArtist,
  isRealOrganization,
  uploadEventImage,
  createEventWithCollaborators,
  updateEventFull,
  type UpdateEventPayload,
  fetchEventDeletionInfo,
  cancelEvent,
  deleteEvent,
  fetchCollaborators,
  inviteCollaborator,
  respondToInvitation,
  fetchPendingInvitations,
  removeCollaborator,
  fetchEventComments,
  addEventComment,
  deleteEventComment,
  fetchEventReactions,
  toggleEventReaction,
  fetchEventQuestions,
  addEventQuestion,
  answerEventQuestion,
  fetchEventSchedule,
  addScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
  fetchEventLiveLinks,
  addEventLiveLink,
  toggleLiveLink,
  deleteEventLiveLink,
  fetchEventSponsors,
  addEventSponsor,
  updateEventSponsor,
  deleteEventSponsor,
  getFaviconUrl,
  fetchPlatformStats,
  type PlatformStats,
  fetchFeaturedEvents,
  fetchEventsByCategory,
  fetchTrendingEvents,
  fetchUpcomingEvents,
  fetchEventById,
  searchEvents,
  toggleEventLike,
  incrementEventViews,
  subscribeToEventViews,
  subscribeToEventAttendees,
  subscribeToEventLive,
  subscribeToGlobalEventsLive,
  subscribeToTicketInventory,
  subscribeToUserTicketsLive,
  useRealtimeEvent,
  useRealtimeInventory,
  useRealtimeUserTickets,
} from '@/features/events';

// ==================== TICKETS & BILLETTERIE DOMAIN ====================
export {
  fetchTicketOptions,
  createTicketOption,
  bookTicket,
  cancelTicket,
  setEventStatus,
  fetchUserTickets,
  validateTicketQr,
} from '@/features/tickets';

// ==================== ARTISTS DOMAIN ====================
export {
  fetchFeaturedArtists,
  fetchArtistById,
  fetchArtistStats,
  fetchEventsByArtist,
  searchArtists,
  toggleArtistFollow,
  isFollowingArtist,
  fetchFollowedArtists,
} from '@/features/artists';

// ==================== ORGANIZERS DOMAIN ====================
export {
  fetchVerifiedOrganizations,
  fetchOrganizationById,
  fetchEventsByOrganization,
  isFollowingOrganization,
  fetchOrganizerPerformanceMetrics,
  type OrganizerPerformanceData,
  type PerformanceTimePoint,
  type TicketTypeBreakdown,
  fetchOrganizerStats,
  searchOrganizations,
  toggleOrganizationFollow,
  fetchFollowedOrganizations,
} from '@/features/organizers';

// ==================== NOTIFICATIONS DOMAIN ====================
export {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type Notification,
  type NotificationPreferences,
} from '@/features/notifications';

// ==================== USERS & PROFILES DOMAIN ====================
export {
  searchProfiles,
  toggleUserFollow,
  isFollowingUser,
  fetchFollowingUsers,
  fetchUserFollowersCount,
  fetchUserFollowingCount,
  fetchProfileById,
} from '@/features/users';
