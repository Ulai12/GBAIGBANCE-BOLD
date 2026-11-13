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

  let ptr = 0;
  let inLen = 0;
  let outPtr = 0;
  let outLen = 0;

  try {
    const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
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

    const text = Buffer.from(copy).toString('utf8');
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('[RustServerCore] Error executing wasm operation:', err);
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

export async function serverVerifyQr(payload: string, eventId?: string): Promise<{
  valid: boolean;
  ticket_id?: string;
  event_id?: string;
  tier?: string;
  legacy?: boolean;
  reason?: string | null;
}> {
  const res = await execRustServer<{
    valid: boolean;
    ticket_id?: string;
    event_id?: string;
    tier?: string;
    legacy?: boolean;
    reason?: string | null;
  }>({
    op: 'verify_qr',
    payload,
    event_id: eventId,
  });

  if (res && typeof res.valid === 'boolean') return res;

  // Fallback
  const trimmed = (payload || '').trim();
  if (!trimmed) return { valid: false, legacy: false, reason: 'QR Code manquant' };
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
    if (!ticketId || !payloadEventId || !Number.isFinite(ts) || !/^[a-f0-9]{24}$/i.test(sig)) {
      return { valid: false, legacy: false, reason: 'Payload ou signature QR invalide' };
    }
    if (eventId && eventId.trim() && eventId.trim() !== payloadEventId) {
      return { valid: false, legacy: false, ticket_id: ticketId, event_id: payloadEventId, reason: 'Billet pour un autre événement' };
    }
    return { valid: true, legacy: false, ticket_id: ticketId, event_id: payloadEventId, tier };
  }
  if (trimmed.length < 8) {
    return { valid: false, legacy: false, reason: 'Format de QR code non reconnu' };
  }
  return { valid: true, legacy: true, ticket_id: trimmed, event_id: eventId, tier: 'standard' };
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
  road_distance_km?: number;
  travel_minutes?: number | null;
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
      road_distance_km?: number;
      travel_minutes?: number | null;
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
