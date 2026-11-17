import { supabase, supabaseUrl, supabaseAnonKey } from '@/infrastructure/supabase';
import type { MapsGroundingPlace } from '@/services/gemini';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA (STREAMING & MAPS)
// ====================================================================

export interface AIAssistantMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface StreamDoneMeta {
  groundingPlaces?: MapsGroundingPlace[];
  model?: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (verifiedEventIds: string[], meta?: StreamDoneMeta) => void;
  onError: (error: string, isQuotaExceeded?: boolean) => void;
}

export interface SendMessageOptions {
  messages: AIAssistantMessage[];
  userLocation?: { lat: number; lng: number } | null;
  fastMode?: boolean;
  useMapsGrounding?: boolean;
}

function sanitizeLocation(
  userLocation?: { lat: number; lng: number } | null
): { lat: number; lng: number } | null {
  if (
    userLocation &&
    typeof userLocation.lat === 'number' &&
    typeof userLocation.lng === 'number'
  ) {
    return {
      lat: Number(userLocation.lat.toFixed(4)),
      lng: Number(userLocation.lng.toFixed(4)),
    };
  }
  return null;
}

function extractEventIds(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.verifiedEventIds)) {
    return data.verifiedEventIds.filter((id): id is string => typeof id === 'string');
  }
  if (Array.isArray(data.event_ids)) {
    return data.event_ids.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

function extractGroundingPlaces(data: Record<string, unknown>): MapsGroundingPlace[] {
  if (!Array.isArray(data.groundingPlaces)) return [];
  return data.groundingPlaces.filter(
    (p): p is MapsGroundingPlace =>
      Boolean(p && typeof p === 'object' && typeof (p as MapsGroundingPlace).uri === 'string')
  );
}

async function parseSseResponse(
  response: Response,
  callbacks: StreamCallbacks,
  signal: AbortSignal
): Promise<void> {
  if (!response.body) {
    callbacks.onError('Flux de réponse non disponible.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let verifiedEventIds: string[] = [];
  let groundingPlaces: MapsGroundingPlace[] = [];
  let modelName: string | undefined;

  try {
    while (true) {
      if (signal.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const data = JSON.parse(dataStr) as Record<string, unknown>;
          if (typeof data.text === 'string' && data.text) {
            callbacks.onChunk(data.text);
          } else if (typeof data.chunk === 'string' && data.chunk) {
            callbacks.onChunk(data.chunk);
          }

          const ids = extractEventIds(data);
          if (ids.length > 0) verifiedEventIds = ids;

          const places = extractGroundingPlaces(data);
          if (places.length > 0) groundingPlaces = places;

          if (typeof data.model === 'string' && data.model) {
            modelName = data.model;
          }

          if (typeof data.error === 'string' && data.error) {
            callbacks.onError(data.error);
            return;
          }
        } catch {
          if (!dataStr.startsWith('{')) {
            callbacks.onChunk(dataStr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone(verifiedEventIds, { groundingPlaces, model: modelName });
}

async function parseJsonResponse(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof data.error === 'string' && data.error) {
    callbacks.onError(data.error, response.status === 429);
    return;
  }
  const text =
    (typeof data.text === 'string' && data.text) ||
    (typeof data.message === 'string' && data.message) ||
    '';
  if (text) callbacks.onChunk(text);
  callbacks.onDone(extractEventIds(data), {
    groundingPlaces: extractGroundingPlaces(data),
    model: typeof data.model === 'string' ? data.model : undefined,
  });
}

async function postAssistant(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Envoie la conversation :
 * 1) `/api/ai/assistant/stream` (serveur Express Gemini 4 + Google Maps Grounding)
 * 2) Edge Function Supabase `ai-assistant` (repli sans serveur Node local)
 * 3) `/api/ai-assistant` (repli proxy Vercel plat)
 */
export async function streamAIAssistant(
  options: SendMessageOptions,
  callbacks: StreamCallbacks
): Promise<() => void> {
  const controller = new AbortController();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    callbacks.onError('Vous êtes actuellement hors-ligne. Vérifiez votre connexion Internet.');
    return () => {};
  }

  (async () => {
    const sanitizedLocation = sanitizeLocation(options.userLocation ?? null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        messages: options.messages.map((m) => ({
          role: m.role,
          text: m.text.slice(0, 1500),
          content: m.text.slice(0, 1500),
        })),
        userLocation: sanitizedLocation,
        fastMode: Boolean(options.fastMode),
        useMapsGrounding: options.useMapsGrounding !== false,
      };

      let response: Response | null = null;
      let lastError = '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      // 1) Serveur applicatif local (/api/ai/assistant/stream) avec Gemini 4 Hydrogen + Maps Grounding
      try {
        const localRes = await postAssistant('/api/ai/assistant/stream', headers, payload, controller.signal);
        if (localRes.ok) {
          response = localRes;
        } else {
          const errorData = await localRes.clone().json().catch(() => ({}));
          lastError =
            (errorData as { error?: string }).error ||
            (errorData as { message?: string }).message ||
            `Erreur serveur IA (${localRes.status})`;
          if (localRes.status === 429) {
            callbacks.onError(lastError, true);
            return;
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Serveur IA local inaccessible';
      }

      // 2) Repli Edge Function Supabase puis proxy plat Vercel si le chemin local n'est pas disponible
      if (!response) {
        const edgeUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-assistant`;
        const edgeHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : `Bearer ${supabaseAnonKey}`,
        };

        try {
          const edgeRes = await postAssistant(edgeUrl, edgeHeaders, payload, controller.signal);
          if (edgeRes.ok) {
            response = edgeRes;
          } else {
            const errorData = await edgeRes.clone().json().catch(() => ({}));
            lastError =
              (errorData as { error?: string }).error ||
              (errorData as { message?: string }).message ||
              lastError;
            if (edgeRes.status === 429) {
              callbacks.onError(lastError, true);
              return;
            }
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : lastError;
        }
      }

      if (!response) {
        try {
          const proxyRes = await postAssistant('/api/ai-assistant', headers, payload, controller.signal);
          if (proxyRes.ok) {
            response = proxyRes;
          } else {
            const errorData = await proxyRes.clone().json().catch(() => ({}));
            lastError =
              (errorData as { error?: string }).error ||
              (errorData as { message?: string }).message ||
              lastError;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : lastError;
        }
      }

      if (!response) {
        callbacks.onError(lastError || 'Assistant IA indisponible.');
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        await parseJsonResponse(response, callbacks);
      } else {
        await parseSseResponse(response, callbacks, controller.signal);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const errorMsg = err instanceof Error ? err.message : 'Erreur inattendue';
      callbacks.onError(errorMsg);
    }
  })();

  return () => {
    controller.abort();
  };
}
