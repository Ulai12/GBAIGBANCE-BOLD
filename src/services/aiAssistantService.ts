import { supabase, supabaseUrl, supabaseAnonKey } from '@/infrastructure/supabase';
import { getAIAssistantPreferences } from '@/services/aiSettings';
import type { MapsGroundingPlace } from '@/services/gemini';

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
    (place): place is MapsGroundingPlace =>
      Boolean(place && typeof place === 'object' && typeof (place as MapsGroundingPlace).uri === 'string')
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

  const processLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) return false;

    const dataStr = trimmed.slice(5).trim();
    if (!dataStr || dataStr === '[DONE]') return false;

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

      if (typeof data.model === 'string' && data.model) modelName = data.model;
      if (typeof data.error === 'string' && data.error) {
        callbacks.onError(data.error);
        return true;
      }
    } catch {
      if (!dataStr.startsWith('{')) callbacks.onChunk(dataStr);
    }

    return false;
  };

  try {
    while (true) {
      if (signal.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (processLine(line)) return;
      }
    }

    buffer += decoder.decode();
    if (buffer && processLine(buffer)) return;
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

export async function streamAIAssistant(
  options: SendMessageOptions,
  callbacks: StreamCallbacks
): Promise<() => void> {
  const controller = new AbortController();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    callbacks.onError('Vous êtes actuellement hors-ligne. Vérifiez votre connexion Internet.');
    return () => {};
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 60_000);
  const reportTimeout = () => {
    if (timedOut) callbacks.onError('La réponse de l’assistant prend trop de temps. Réessaie dans un instant.');
  };

  (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseAnonKey;
      const payload = {
        messages: options.messages.map((message) => ({
          role: message.role,
          text: message.text.slice(0, 1500),
          content: message.text.slice(0, 1500),
        })),
        userLocation: sanitizeLocation(options.userLocation ?? null),
        fastMode: Boolean(options.fastMode),
        useMapsGrounding: options.useMapsGrounding !== false,
        preferences: getAIAssistantPreferences(),
      };
      const edgeUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-assistant`;
      const candidates: Array<{ url: string; headers: Record<string, string> }> = [
        {
          url: '/api/ai/assistant/stream',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        },
        {
          url: edgeUrl,
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
          },
        },
        {
          url: '/api/ai-assistant',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        },
      ];

      let response: Response | null = null;
      let lastError = '';
      for (const candidate of candidates) {
        try {
          const result = await postAssistant(candidate.url, candidate.headers, payload, controller.signal);
          if (result.ok) {
            response = result;
            break;
          }

          const errorData = (await result.clone().json().catch(() => ({}))) as Record<string, unknown>;
          lastError =
            (typeof errorData.error === 'string' && errorData.error) ||
            (typeof errorData.message === 'string' && errorData.message) ||
            `Erreur serveur IA (${result.status})`;
          if (result.status === 429) {
            callbacks.onError(lastError, true);
            return;
          }
        } catch (error) {
          if (controller.signal.aborted) {
            reportTimeout();
            return;
          }
          lastError = error instanceof Error ? error.message : lastError || 'Service IA inaccessible';
        }
      }

      if (!response) {
        callbacks.onError(lastError || 'Assistant IA indisponible.');
        return;
      }

      if ((response.headers.get('content-type') || '').includes('application/json')) {
        await parseJsonResponse(response, callbacks);
      } else {
        await parseSseResponse(response, callbacks, controller.signal);
        reportTimeout();
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        reportTimeout();
        return;
      }
      callbacks.onError(error instanceof Error ? error.message : 'Erreur inattendue');
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  return () => controller.abort();
}
