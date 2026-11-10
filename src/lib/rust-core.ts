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
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const ptr = wasm.gba_alloc(bytes.length);
  new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
  const outPtr = wasm.gba_exec(ptr, bytes.length);
  const outLen = wasm.gba_last_len();
  wasm.gba_free(ptr, bytes.length);
  const copy = new Uint8Array(outLen);
  copy.set(new Uint8Array(wasm.memory.buffer, outPtr, outLen));
  wasm.gba_free(outPtr, outLen);
  return JSON.parse(new TextDecoder().decode(copy)) as T;
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
