import { supabase, supabaseUrl, supabaseAnonKey } from '@/infrastructure/supabase';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA (STREAM + FALLBACK)
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
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Envoie la conversation :
 * 1) `/api/ai/assistant/stream` (Express local ou route Vercel)
 * 2) fallback Edge Function Supabase `ai-assistant`
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const payload = {
        messages: options.messages.map((m) => ({
          role: m.role,
          text: m.text.slice(0, 1000),
          content: m.text.slice(0, 1000),
        })),
        userLocation: sanitizedLocation,
      };

      let response: Response | null = null;
      let lastError = '';

      try {
        response = await postAssistant('/api/ai/assistant/stream', headers, payload, controller.signal);
        if (!response.ok) {
          const errorData = await response.clone().json().catch(() => ({}));
          lastError =
            (errorData as { error?: string }).error ||
            (errorData as { message?: string }).message ||
            `Erreur serveur (${response.status})`;
          if (response.status === 429) {
            callbacks.onError(lastError, true);
            return;
          }
          response = null;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Route /api inaccessible';
        response = null;
      }

      if (!response) {
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Edge IA inaccessible';
          callbacks.onError(lastError || msg);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            (errorData as { error?: string }).error ||
            (errorData as { message?: string }).message ||
            lastError ||
            `Erreur assistant IA (${response.status})`;
          callbacks.onError(errorMessage, response.status === 429);
          return;
        }
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
