import { supabase } from '@/infrastructure/supabase';
import { getUserGeminiApiKey } from '@/services/gemini';
import { streamGeminiDirect } from '@/services/aiAssistantDirect';

// ====================================================================
// GBAIGBANCE — CLIENT SERVICE POUR L'ASSISTANT IA EDGE FUNCTION & HYBRIDE
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
 * Envoie la conversation à l'Edge Function Supabase `ai-assistant` ou bascule
 * de manière transparente sur le client direct si la fonction n'est pas encore déployée (404).
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
    // 0. Clé API utilisateur si fournie (BYOK)
    const userApiKey = getUserGeminiApiKey();

    // Arrondi GPS à ~1 km pour préserver la vie privée
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
      // 1. Récupération du JWT de session active s'il existe
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // 2. URL de l'Edge Function Supabase
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

      if (userApiKey) {
        headers['x-gemini-api-key'] = userApiKey;
      }

      let response: Response;
      try {
        response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            apiKey: userApiKey || undefined,
            messages: options.messages.map((m) => ({
              role: m.role,
              text: m.text.slice(0, 1000),
            })),
            userLocation: sanitizedLocation,
          }),
          signal: controller.signal,
        });
      } catch {
        // En cas d'échec réseau (fonction introuvable / non déployée)
        if (userApiKey) {
          await streamGeminiDirect(
            userApiKey,
            options.messages,
            sanitizedLocation,
            callbacks,
            controller.signal
          );
          return;
        }
        throw new Error(
          'L’Edge Function Supabase est inaccessible. Renseignez votre propre clé API Gemini dans les réglages pour activer l’assistant immédiatement.'
        );
      }

      // 4. Gestion spécifique du 404 (fonction non déployée sur Supabase)
      if (response.status === 404) {
        if (userApiKey) {
          await streamGeminiDirect(
            userApiKey,
            options.messages,
            sanitizedLocation,
            callbacks,
            controller.signal
          );
          return;
        }

        callbacks.onError(
          'L’Edge Function Supabase n’est pas encore déployée (HTTP 404). Entrez votre propre clé API Google Gemini pour utiliser l’assistant tout de suite !'
        );
        return;
      }

      // Autres erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erreur serveur (${response.status})`;
        const isQuota = response.status === 429 || errorData.reason === 'window_limit' || errorData.reason === 'daily_limit';
        
        // Si l'erreur est un manque de clé sur le serveur et qu'on n'en a pas
        if (response.status === 400 && !userApiKey) {
          callbacks.onError(
            'Aucune clé Gemini configurée sur le serveur. Veuillez renseigner votre propre clé API Gemini dans les réglages pour démarrer.'
          );
          return;
        }

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
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'chunk' && typeof data.text === 'string') {
                callbacks.onChunk(data.text);
              } else if (data.type === 'done') {
                if (Array.isArray(data.verified_event_ids)) {
                  verifiedEventIds = data.verified_event_ids;
                }
              } else if (data.type === 'error') {
                callbacks.onError(data.error || 'Erreur inconnue dans le flux.');
                return;
              }
            } catch {
              // Ignorer fragments non JSON
            }
          }
        }
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
