import { supabase } from '@/infrastructure/supabase';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA EDGE FUNCTION
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
 * Envoie la conversation à l'Edge Function Supabase `ai-assistant` et lit le flux SSE.
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
    try {
      // 1. Récupération du JWT de session active s'il existe
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // 2. URL de l'Edge Function
      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL ||
        import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://lwwiolbofrqakvrdvbbj.supabase.co';

      const functionUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-assistant`;

      const supabaseAnonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        'sb_publishable_eE9BhdjrsQP6dwfo3hV88A_u831UYMF';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // 3. Préparation du payload (arrondi GPS à ~1 km)
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

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: options.messages.map((m) => ({
            role: m.role,
            text: m.text.slice(0, 1000),
          })),
          userLocation: sanitizedLocation,
        }),
        signal: controller.signal,
      });

      // 4. Gestion des erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erreur serveur (${response.status})`;
        const isQuota = response.status === 429 || errorData.reason === 'window_limit' || errorData.reason === 'daily_limit';
        callbacks.onError(errorMessage, isQuota);
        return;
      }

      if (!response.body) {
        callbacks.onError('Flux de réponse non disponible.');
        return;
      }

      // 5. Lecture du flux Server-Sent Events (SSE)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let verifiedEventIds: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              callbacks.onError(data.error);
              return;
            }
            if (data.text) {
              callbacks.onChunk(data.text);
            }
            if (data.done) {
              if (Array.isArray(data.event_ids)) {
                verifiedEventIds = data.event_ids;
              }
            }
          } catch {
            // Ignorer les fragments incomplets
          }
        }
      }

      callbacks.onDone(verifiedEventIds);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erreur lors de la communication avec l’assistant.';
      callbacks.onError(msg);
    }
  })();

  return () => {
    controller.abort();
  };
}
