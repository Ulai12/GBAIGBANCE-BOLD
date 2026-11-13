/**
 * Pont vers le cœur Rust (WebAssembly).
 * Stats, fusion des billets, classement et stock ne sont plus recalculés
 * de deux façons différentes dans l'interface.
 */

export interface RustTicket {
  id: string;
  price_paid: number;
  status: string;
  created_at_ms: number;
  event_id: string;
  ticket_type?: string;
  source: 'server' | 'local';
}

export interface RustEvent {
  id: string;
  category?: string;
  attendees?: number;
  views?: number;
  likes?: number;
  featured?: boolean;
  starts_at_ms?: number;
  active?: boolean;
  terminated?: boolean;
  title?: string;
  city?: string;
  description?: string;
  location?: string;
}

export interface CategoryShare {
  id: string;
  count: number;
  amount: number;
  percent: number;
}

export interface PlatformCoreStats {
  total_tickets: number;
  total_revenue: number;
  total_events: number;
  total_views: number;
  total_users: number;
  category_basis: 'revenue' | 'events';
  category_shares: CategoryShare[];
  timeline: Array<{ created_at_ms: number; price_paid: number; event_id: string }>;
}

export interface TimelineBucket {
  year: number;
  month: number;
  week: number | null;
  tickets: number;
  revenue: number;
  attendees: number;
  events: number;
}

export interface OrganizerPoint {
  year: number;
  month: number;
  day: number;
  tickets_sold: number;
  revenue: number;
  cumulative_tickets: number;
  cumulative_revenue: number;
}

interface WasmExports {
  memory: WebAssembly.Memory;
  gba_alloc: (len: number) => number;
  gba_exec: (ptr: number, len: number) => number;
  gba_last_len: () => number;
  gba_free: (ptr: number, len: number) => void;
}

let loading: Promise<WasmExports> | null = null;
let engine: 'rust' | 'js' = 'js';

export function statsEngine(): 'rust' | 'js' {
  return engine;
}

function wasmUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}wasm/gbaigbance-core.wasm`;
}

export function initGbaCore(): Promise<void> {
  return load().then(() => undefined).catch(() => undefined);
}

async function load(): Promise<WasmExports | null> {
  if (typeof WebAssembly === 'undefined') return null;
  if (!loading) {
    loading = (async () => {
      const response = await fetch(wasmUrl());
      if (!response.ok) throw new Error('wasm');
      const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
      engine = 'rust';
      return instance.exports as unknown as WasmExports;
    })().catch((error) => {
      loading = null;
      engine = 'js';
      throw error;
    });
  }
  try {
    return await loading;
  } catch {
    return null;
  }
}

async function exec<T>(payload: unknown): Promise<T | null> {
  const wasm = await load();
  if (!wasm) return null;
  let ptr = 0;
  let inLen = 0;
  let outPtr = 0;
  let outLen = 0;
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    inLen = bytes.length;
    ptr = wasm.gba_alloc(inLen);
    new Uint8Array(wasm.memory.buffer, ptr, inLen).set(bytes);
    outPtr = wasm.gba_exec(ptr, inLen);
    outLen = wasm.gba_last_len();
    wasm.gba_free(ptr, inLen);
    ptr = 0;
    const copy = new Uint8Array(outLen);
    copy.set(new Uint8Array(wasm.memory.buffer, outPtr, outLen));
    wasm.gba_free(outPtr, outLen);
    outPtr = 0;
    return JSON.parse(new TextDecoder().decode(copy)) as T;
  } catch {
    return null;
  } finally {
    if (ptr !== 0 && inLen > 0) {
      try { wasm.gba_free(ptr, inLen); } catch { /* ignore */ }
    }
    if (outPtr !== 0 && outLen > 0) {
      try { wasm.gba_free(outPtr, outLen); } catch { /* ignore */ }
    }
  }
}

export function tzOffsetMin(): number {
  return -new Date().getTimezoneOffset();
}

export async function corePlatformStats(input: {
  tickets: RustTicket[];
  events: RustEvent[];
  users: number;
}): Promise<PlatformCoreStats | null> {
  return exec<PlatformCoreStats>({ op: 'platform_stats', ...input });
}

export async function coreTimeline(input: {
  period: 'current_month' | 'last_month' | 'quarter';
  nowMs: number;
  tickets: Array<{ id: string; created_at_ms: number; price_paid: number; status: string }>;
  events: Array<{ id: string; starts_at_ms: number; attendees: number }>;
}): Promise<TimelineBucket[] | null> {
  const result = await exec<{ buckets: TimelineBucket[] }>({
    op: 'timeline',
    period: input.period,
    now_ms: input.nowMs,
    tz_offset_min: tzOffsetMin(),
    tickets: input.tickets,
    events: input.events,
  });
  return result?.buckets ?? null;
}

export async function coreMergeIds(serverIds: string[], localIds: string[], dropIds: string[]): Promise<string[] | null> {
  const result = await exec<{ ids: string[] }>({
    op: 'merge',
    server_ids: serverIds,
    local_ids: localIds,
    drop_ids: dropIds,
  });
  return result?.ids ?? null;
}

export async function coreRankIds(events: RustEvent[]): Promise<string[] | null> {
  const result = await exec<{ ids: string[] }>({ op: 'rank', events });
  return result?.ids ?? null;
}

export async function coreSearchIds(query: string, events: RustEvent[]): Promise<string[] | null> {
  const result = await exec<{ ids: string[] }>({ op: 'search', query, min_score: 1, events });
  return result?.ids ?? null;
}

export async function coreTrendIds(events: RustEvent[], nowMs = Date.now()): Promise<string[] | null> {
  if (events.length === 0) return null;
  const result = await exec<{ ids: string[] }>({ op: 'trend', now_ms: nowMs, events });
  return result?.ids ?? null;
}

export async function coreOrganizerSeries(days: number, tickets: RustTicket[]): Promise<{
  points: OrganizerPoint[];
  tickets: number;
  revenue: number;
  by_type: Array<{ key: string; count: number; revenue: number }>;
} | null> {
  return exec({
    op: 'organizer_series',
    days,
    now_ms: Date.now(),
    tz_offset_min: tzOffsetMin(),
    tickets,
  });
}

export async function coreStock(sold: number, capacity: number): Promise<{ remaining: number; percent_sold: number } | null> {
  return exec({ op: 'stock', sold, capacity });
}

export interface NearbyGeoEvent {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  title?: string;
  city?: string;
  category?: string;
  starts_at?: string;
  location_name?: string;
  price_min?: number | null;
  currency?: string | null;
}

export interface NearbyGeoResult {
  id: string;
  distance_km: number;
  road_distance_km?: number;
  travel_minutes?: number | null;
  title: string;
  city: string;
  category: string;
  starts_at: string;
  location_name: string;
  price_min: number | null;
  currency: string | null;
}

export async function coreHaversineDetails(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<{ distance_km: number; road_distance_km: number; travel_minutes: number | null }> {
  const res = await exec<{ distance_km: number; road_distance_km?: number; travel_minutes?: number | null }>({
    op: 'haversine',
    lat1,
    lng1,
    lat2,
    lng2,
  });
  if (res && typeof res.distance_km === 'number') {
    const roadKm =
      typeof res.road_distance_km === 'number'
        ? res.road_distance_km
        : Math.round(res.distance_km * (res.distance_km < 35 ? 1.28 : 1.15) * 10) / 10;
    return {
      distance_km: res.distance_km,
      road_distance_km: roadKm,
      travel_minutes: res.travel_minutes ?? null,
    };
  }
  const distKm = coreHaversineDistanceFallback(lat1, lng1, lat2, lng2);
  const roadKm = Math.round(distKm * (distKm < 35 ? 1.28 : 1.15) * 10) / 10;
  return {
    distance_km: distKm,
    road_distance_km: roadKm,
    travel_minutes: roadKm <= 60 ? Math.max(2, Math.round((roadKm / 24) * 60 + 4)) : null,
  };
}

export async function coreHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number | null> {
  const details = await coreHaversineDetails(lat1, lng1, lat2, lng2);
  return details.distance_km;
}

export async function coreNearbyEvents(
  lat: number,
  lng: number,
  radiusKm = 25,
  limit = 10,
  events: NearbyGeoEvent[] = []
): Promise<{ count: number; radius_km: number; events: NearbyGeoResult[] }> {
  const res = await exec<{ count: number; radius_km: number; events: NearbyGeoResult[] }>({
    op: 'nearby_events',
    lat,
    lng,
    radius_km: radiusKm,
    limit,
    events,
  });
  if (res && Array.isArray(res.events)) return res;

  // Fallback JS
  const filtered = events
    .filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number')
    .map((e) => {
      const d = (coreHaversineDistanceFallback(lat, lng, e.latitude!, e.longitude!));
      return {
        id: e.id,
        distance_km: d,
        title: e.title || '',
        city: e.city || '',
        category: e.category || '',
        starts_at: e.starts_at || '',
        location_name: e.location_name || '',
        price_min: e.price_min ?? null,
        currency: e.currency ?? 'XOF',
      };
    })
    .filter((e) => e.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  return { count: filtered.length, radius_km: radiusKm, events: filtered };
}

function coreHaversineDistanceFallback(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371 * c * 10) / 10;
}

export interface TicketSignatureResult {
  signature: string;
  qr_payload: string;
  short_code: string;
  valid: boolean;
}

export async function coreSignTicket(
  ticketId: string,
  eventId: string,
  tier = 'standard',
  createdAtMs = Date.now(),
  secretSalt?: string
): Promise<TicketSignatureResult> {
  const res = await exec<TicketSignatureResult>({
    op: 'ticket_signature',
    ticket_id: ticketId,
    event_id: eventId,
    tier,
    created_at_ms: createdAtMs,
    secret_salt: secretSalt,
  });
  if (res && res.qr_payload) return res;

  // Fallback signature
  const sig = `sig_${ticketId.slice(0, 8)}_${eventId.slice(0, 4)}`;
  return {
    signature: sig,
    qr_payload: `GBA-1:${ticketId}:${eventId}:${tier}:${createdAtMs}:${sig}`,
    short_code: `GBA-${ticketId.slice(0, 4).toUpperCase()}`,
    valid: true,
  };
}

export interface VerifyQrResult {
  valid: boolean;
  ticket_id?: string;
  event_id?: string;
  tier?: string;
  created_at_ms?: number;
  signature?: string;
  reason?: string | null;
  legacy?: boolean;
}

export async function coreVerifyQr(
  payload: string,
  eventId?: string,
  secretSalt?: string
): Promise<VerifyQrResult> {
  const res = await exec<VerifyQrResult>({
    op: 'verify_qr',
    payload,
    event_id: eventId,
    secret_salt: secretSalt,
  });
  if (res && typeof res.valid === 'boolean') return res;

  // Fallback basic check
  const trimmed = (payload || '').trim();
  if (!trimmed) return { valid: false, legacy: false, reason: 'QR Code vide' };
  if (trimmed.startsWith('GBA-1:')) {
    const parts = trimmed.split(':');
    if (parts.length !== 6) {
      return { valid: false, legacy: false, reason: 'Payload QR code invalide ou incomplet' };
    }
    const ticketId = parts[1].trim();
    const payloadEventId = parts[2].trim();
    const tier = parts[3].trim();
    const ts = Number(parts[4].trim());
    const sig = parts[5].trim();
    if (!ticketId || !payloadEventId || !Number.isFinite(ts)) {
      return { valid: false, legacy: false, reason: 'Payload QR code corrompu' };
    }
    if (!/^[a-f0-9]{24}$/i.test(sig) && !sig.startsWith('sig_')) {
      return { valid: false, legacy: false, reason: 'Format de signature invalide' };
    }
    if (eventId && eventId.trim() && eventId.trim() !== payloadEventId) {
      return {
        valid: false,
        legacy: false,
        ticket_id: ticketId,
        event_id: payloadEventId,
        reason: 'Ce billet appartient à un autre événement',
      };
    }
    return { valid: true, legacy: false, ticket_id: ticketId, event_id: payloadEventId, tier, created_at_ms: ts };
  }
  if (trimmed.length < 8) {
    return { valid: false, legacy: false, reason: 'Format de QR code non reconnu' };
  }
  return { valid: true, ticket_id: trimmed, event_id: eventId, tier: 'standard', legacy: true };
}

export interface FinancialFeesResult {
  total_amount: number;
  platform_fee: number;
  operator_fee: number;
  organizer_payout: number;
  fee_percent: number;
  fixed_fee: number;
  currency: string;
}

export async function coreFinancialFees(
  pricePaid: number,
  quantity = 1,
  paymentMethod: 'mobile_money' | 'card' | 'free' = 'mobile_money'
): Promise<FinancialFeesResult> {
  const res = await exec<FinancialFeesResult>({
    op: 'financial_fees',
    price_paid: pricePaid,
    quantity,
    payment_method: paymentMethod,
  });
  if (res && typeof res.total_amount === 'number') return res;

  // Fallback JS
  const total = pricePaid * quantity;
  const pct = paymentMethod === 'card' ? 0.035 : paymentMethod === 'free' ? 0 : 0.025;
  const fixed = paymentMethod === 'card' ? 100 : paymentMethod === 'free' ? 0 : 50;
  const platformFee = total > 0 ? Math.round(total * pct + fixed) : 0;
  const operatorFee = total > 0 ? Math.round(total * 0.012) : 0;
  return {
    total_amount: total,
    platform_fee: platformFee,
    operator_fee: operatorFee,
    organizer_payout: Math.max(0, total - platformFee),
    fee_percent: Math.round(pct * 100),
    fixed_fee: fixed,
    currency: 'XOF',
  };
}

export async function coreFuzzySearch(
  query: string,
  events: RustEvent[]
): Promise<string[] | null> {
  const result = await exec<{ ids: string[] }>({ op: 'fuzzy_search', query, events });
  return result?.ids ?? null;
}

