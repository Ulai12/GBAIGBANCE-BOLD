/** Réexport : une seule implémentation, partagée avec l'edge function. */
export {
  EVENT_CATEGORIES,
  VISIBLE_TICKET_STATUSES,
  catalogDateWindow,
  clampLimit,
  clampRadiusKm,
  formatEventPrice,
  haversineKm,
  normalizeCategory,
  sanitizeSearchTerm,
  ticketStatusLabel,
  withinRadius,
} from '../../supabase/functions/_shared/aiCatalog.ts';

export type {
  CatalogDateRange,
  DateWindow,
  EventCategory,
  GeoPoint,
} from '../../supabase/functions/_shared/aiCatalog.ts';
