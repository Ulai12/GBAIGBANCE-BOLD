import { supabase, supabaseUrl, supabaseAnonKey } from '@/infrastructure/supabase';
import { getAIAssistantPreferences, getUserGeminiApiKey } from '@/services/aiSettings';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA (EDGE-FIRST + PROXY)
// ====================================================================

export interface AIAssistantMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (verifiedEventIds: string[]) => void;
  onError: (error: string, isQuotaExceeded?: boolean) => void;
}

export interface SendMessageOptions {
  messages: AIAssistantMessage[];
  userLocation?: { lat: number; lng: number } | null;
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
      lat: Number(userLocation.lat.toFixed(2)),
      lng: Number(userLocation.lng.toFixed(2)),
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
    if (processLine(buffer)) return;
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone(verifiedEventIds);
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
  callbacks.onDone(extractEventIds(data));
}

async function postAssistant(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal
): Promise<Response> {
  const apiKey = getUserGeminiApiKey();
  if (apiKey) headers['x-gemini-api-key'] = apiKey;
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Envoie la conversation :
 * 1) Edge Function Supabase `ai-assistant` (chemin principal fiable)
 * 2) `/api/ai-assistant` (proxy Vercel plat)
 * 3) `/api/ai/assistant/stream` (compat Express local)
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

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 60_000);
  const reportTimeout = () => {
    if (timedOut) callbacks.onError('La réponse de l’assistant prend trop de temps. Réessaie dans un instant.');
  };

  (async () => {
    const sanitizedLocation = sanitizeLocation(options.userLocation ?? null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        messages: options.messages.map((m) => ({
          role: m.role,
          text: m.text.slice(0, 1000),
          content: m.text.slice(0, 1000),
        })),
        userLocation: sanitizedLocation,
        preferences: getAIAssistantPreferences(),
      };

      let response: Response | null = null;
      let lastError = '';

      const edgeUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-assistant`;
      const edgeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      };
      if (session?.access_token) {
        edgeHeaders.Authorization = `Bearer ${session.access_token}`;
      } else {
        edgeHeaders.Authorization = `Bearer ${supabaseAnonKey}`;
      }

      try {
        response = await postAssistant(edgeUrl, edgeHeaders, payload, controller.signal);
        if (!response.ok) {
          const errorData = await response.clone().json().catch(() => ({}));
          lastError =
            (errorData as { error?: string }).error ||
            (errorData as { message?: string }).message ||
            `Erreur edge IA (${response.status})`;
          if (response.status === 429) {
            callbacks.onError(lastError, true);
            return;
          }
          if ([400, 401, 403].includes(response.status)) {
            callbacks.onError(lastError);
            return;
          }
          response = null;
        }
      } catch (err) {
        if (controller.signal.aborted) {
          reportTimeout();
          return;
        }
        lastError = err instanceof Error ? err.message : 'Edge IA inaccessible';
        response = null;
      }

      if (!response) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        for (const path of ['/api/ai-assistant', '/api/ai/assistant/stream']) {
          try {
            const res = await postAssistant(path, headers, payload, controller.signal);
            if (res.ok) {
              response = res;
              break;
            }
            const errorData = await res.clone().json().catch(() => ({}));
            lastError =
              (errorData as { error?: string }).error ||
              (errorData as { message?: string }).message ||
              `Erreur serveur (${res.status})`;
            if (res.status === 429) {
              callbacks.onError(lastError, true);
              return;
            }
            if ([400, 401, 403].includes(res.status)) {
              callbacks.onError(lastError);
              return;
            }
          } catch (err) {
            if (controller.signal.aborted) {
              reportTimeout();
              return;
            }
            lastError = err instanceof Error ? err.message : lastError || 'Proxy API inaccessible';
          }
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
        reportTimeout();
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        reportTimeout();
        return;
      }
      const errorMsg = err instanceof Error ? err.message : 'Erreur inattendue';
      callbacks.onError(errorMsg);
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  return () => {
    controller.abort();
  };
}
