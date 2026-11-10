import { supabase } from '@/infrastructure/supabase';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA SERVEUR & STREAMING
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

/**
 * Envoie la conversation au service serveur `/api/ai/assistant/stream`
 * avec streaming SSE en temps réel et résolution des outils sur la base d'événements.
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
    let sanitizedLocation = null;
    if (
      options.userLocation &&
      typeof options.userLocation.lat === 'number' &&
      typeof options.userLocation.lng === 'number'
    ) {
      sanitizedLocation = {
        lat: Number(options.userLocation.lat.toFixed(2)),
        lng: Number(options.userLocation.lng.toFixed(2)),
      };
    }

    try {
      // Récupération de la session utilisateur pour contexte
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/ai/assistant/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: options.messages.map((m) => ({
            role: m.role,
            text: m.text.slice(0, 1000),
          })),
          userLocation: sanitizedLocation,
          userId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Erreur serveur (${response.status})`;
        const isQuota = response.status === 429;
        callbacks.onError(errorMessage, isQuota);
        return;
      }

      if (!response.body) {
        callbacks.onError('Flux de réponse non disponible.');
        return;
      }

      // Lecture du flux Server-Sent Events (SSE)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let verifiedEventIds: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                if (typeof data.text === 'string') {
                  callbacks.onChunk(data.text);
                } else if (typeof data.chunk === 'string') {
                  callbacks.onChunk(data.chunk);
                }

                if (Array.isArray(data.verifiedEventIds)) {
                  verifiedEventIds = data.verifiedEventIds;
                }

                if (data.error) {
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
        }
      } finally {
        reader.releaseLock();
      }

      callbacks.onDone(verifiedEventIds);
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
