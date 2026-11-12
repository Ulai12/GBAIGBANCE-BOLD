/** Filtres purs du catalogue utilisé par les outils de l'assistant. */

export const EVENT_CATEGORIES = [
  'concert',
  'festival',
  'conference',
  'formation',
  'exposition',
  'spectacle',
  'cultural',
  'private',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(EVENT_CATEGORIES);

export type CatalogDateRange = 'today' | 'this_weekend' | 'this_week' | 'this_month' | 'upcoming';

export interface DateWindow {
  from: string;
  to: string | null;
}

/** Lomé est sur UTC+0 : les bornes sont calculées en UTC. */
export function catalogDateWindow(range: unknown, now = new Date()): DateWindow {
  const key = typeof range === 'string' ? range.trim() : 'upcoming';
  const soonest = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  if (key === 'today') {
    return { from: startOfUtcDay(now).toISOString(), to: endOfUtcDay(now).toISOString() };
  }

  if (key === 'this_weekend') {
    const day = now.getUTCDay();
    const saturday = startOfUtcDay(now);
    const delta = day === 0 ? -1 : day === 6 ? 0 : 6 - day;
    saturday.setUTCDate(saturday.getUTCDate() + delta);
    const sunday = new Date(saturday);
    sunday.setUTCDate(saturday.getUTCDate() + 1);
    const from = saturday.getTime() < soonest.getTime() ? soonest : saturday;
    return { from: from.toISOString(), to: endOfUtcDay(sunday).toISOString() };
  }

  if (key === 'this_week') {
    const day = now.getUTCDay();
    const monday = startOfUtcDay(now);
    monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const from = monday.getTime() < soonest.getTime() ? soonest : monday;
    return { from: from.toISOString(), to: endOfUtcDay(sunday).toISOString() };
  }

  if (key === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const from = start.getTime() < soonest.getTime() ? soonest : start;
    return { from: from.toISOString(), to: end.toISOString() };
  }

  return { from: now.toISOString(), to: null };
}

export function normalizeCategory(value: unknown): EventCategory | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  return CATEGORY_SET.has(key) ? (key as EventCategory) : null;
}

/**
 * Retire les caractères qui cassent ou injectent un filtre PostgREST `.or()`.
 * Une virgule, un point ou des guillemets dans la saisie ne doivent jamais
 * devenir un opérateur (`id.eq`, `or`, etc.).
 */
export function sanitizeSearchTerm(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\\%_"'`,().:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function formatEventPrice(priceMin: number | null | undefined, currency?: string | null): string {
  if (!priceMin) return 'Gratuit';
  return `${priceMin} ${currency || 'FCFA'}`;
}

/** Statuts réellement persistés. `active` a été migré vers `valid`. */
export const VISIBLE_TICKET_STATUSES = ['pending', 'valid', 'used'] as const;

export function ticketStatusLabel(status: string): string {
  if (status === 'valid') return 'Valide';
  if (status === 'used') return 'Utilisé';
  if (status === 'pending') return 'En attente de paiement';
  return status;
}

export function clampLimit(value: unknown, fallback = 6, max = 8): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}

export function clampRadiusKm(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 15;
  return Math.min(Math.max(n, 1), 25);
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(km * 10) / 10;
}

export interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
}

export function withinRadius<T extends GeoPoint>(
  rows: T[],
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): Array<T & { distance_km: number }> {
  return rows
    .flatMap((row) => {
      if (row.latitude == null || row.longitude == null) return [];
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      const distance_km = haversineKm(lat, lng, latitude, longitude);
      if (distance_km > radiusKm) return [];
      return [{ ...row, distance_km }];
    })
    .sort((a, b) => a.distance_km - b.distance_km || 0)
    .slice(0, limit);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
