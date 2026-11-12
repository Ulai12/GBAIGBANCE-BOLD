import fs from 'node:fs';
import path from 'node:path';

interface WasmExports {
  memory: WebAssembly.Memory;
  gba_alloc: (len: number) => number;
  gba_exec: (ptr: number, len: number) => number;
  gba_last_len: () => number;
  gba_free: (ptr: number, len: number) => void;
}

let wasmInstance: WasmExports | null = null;
let initPromise: Promise<WasmExports | null> | null = null;

export async function initServerRustCore(): Promise<WasmExports | null> {
  if (wasmInstance) return wasmInstance;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const wasmPath = path.resolve(process.cwd(), 'public/wasm/gbaigbance-core.wasm');
        if (!fs.existsSync(wasmPath)) {
          console.warn('[RustServerCore] wasm file not found at', wasmPath);
          return null;
        }
        const buffer = fs.readFileSync(wasmPath);
        const { instance } = await WebAssembly.instantiate(buffer, {});
        wasmInstance = instance.exports as unknown as WasmExports;
        console.log('[RustServerCore] ✅ WebAssembly core initialized on Node.js server');
        return wasmInstance;
      } catch (err) {
        console.warn('[RustServerCore] Failed to load Wasm on server, using pure JS fallback:', err);
        return null;
      }
    })();
  }
  return initPromise;
}

export async function execRustServer<T>(payload: unknown): Promise<T | null> {
  const wasm = await initServerRustCore();
  if (!wasm) return null;

  try {
    const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
    const ptr = wasm.gba_alloc(bytes.length);
    new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
    const outPtr = wasm.gba_exec(ptr, bytes.length);
    const outLen = wasm.gba_last_len();
    wasm.gba_free(ptr, bytes.length);

    const copy = new Uint8Array(outLen);
    copy.set(new Uint8Array(wasm.memory.buffer, outPtr, outLen));
    wasm.gba_free(outPtr, outLen);

    const text = Buffer.from(copy).toString('utf8');
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('[RustServerCore] Error executing wasm operation:', err);
    return null;
  }
}

export async function serverVerifyQr(payload: string, eventId?: string): Promise<{
  valid: boolean;
  ticket_id?: string;
  event_id?: string;
  tier?: string;
  reason?: string | null;
}> {
  const res = await execRustServer<{
    valid: boolean;
    ticket_id?: string;
    event_id?: string;
    tier?: string;
    reason?: string | null;
  }>({
    op: 'verify_qr',
    payload,
    event_id: eventId,
  });

  if (res && typeof res.valid === 'boolean') return res;

  // Fallback
  if (!payload) return { valid: false, reason: 'QR Code manquant' };
  if (payload.startsWith('GBA-1:')) {
    const parts = payload.split(':');
    if (parts.length >= 6) {
      if (eventId && eventId !== parts[2]) {
        return { valid: false, ticket_id: parts[1], event_id: parts[2], reason: 'Billet pour un autre événement' };
      }
      return { valid: true, ticket_id: parts[1], event_id: parts[2], tier: parts[3] };
    }
  }
  return { valid: true, ticket_id: payload, event_id: eventId, tier: 'standard' };
}

export async function serverNearbyEvents(
  lat: number,
  lng: number,
  radiusKm = 25,
  limit = 8,
  events: Array<{
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
  }> = []
): Promise<Array<{
  id: string;
  distance_km: number;
  title: string;
  city: string;
  category: string;
  starts_at: string;
  location_name: string;
  price_min: number | null;
  currency: string | null;
}>> {
  const res = await execRustServer<{
    count: number;
    events: Array<{
      id: string;
      distance_km: number;
      title: string;
      city: string;
      category: string;
      starts_at: string;
      location_name: string;
      price_min: number | null;
      currency: string | null;
    }>;
  }>({
    op: 'nearby_events',
    lat,
    lng,
    radius_km: radiusKm,
    limit,
    events,
  });

  if (res && Array.isArray(res.events)) return res.events;
  return [];
}
