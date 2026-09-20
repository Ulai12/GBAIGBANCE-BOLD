import { supabase } from '@/infrastructure/supabase';
import { getUserGeminiApiKey } from '@/services/gemini';
import { streamGeminiDirect } from '@/services/aiAssistantDirect';
import { safeFetch } from '@/utils/safeFetch';

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
    // 0. Clé API Gemini (BYOK ou variable d'environnement Vercel/Vite)
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
      // 1. Récupération de la session utilisateur Supabase pour propager le JWT
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const userId = session?.user?.id;
      const isUserAuthenticated = Boolean(accessToken && userId);

      console.log(
        `[AIAssistantService] 🚀 Preparing AI turn: authenticated=${isUserAuthenticated}, userId=${userId || 'guest'}, token=${accessToken ? `${accessToken.slice(0, 8)}... (len ${accessToken.length})` : '(none)'}`
      );

      // 2. Détermination des endpoints et credentials Supabase
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
        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
      };

      if (userApiKey) {
        headers['x-gemini-api-key'] = userApiKey;
      }

      console.log(`[AIAssistantService] Calling Edge Function: ${functionUrl}`);

      let response: Response;
      try {
        response = await safeFetch(functionUrl, {
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
          timeoutMs: 35_000,
          retries: 1,
        });
      } catch (fetchErr) {
        // En cas d'erreur de connexion réseau vers l'Edge Function, si l'utilisateur a une clé BYOK, basculer sur le direct
        if (userApiKey) {
          console.warn('[AIAssistantService] Edge Function unreachable. Falling back to direct client execution with BYOK.', fetchErr);
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
          'L’Edge Function Supabase n’est pas joignable. Renseignez votre clé API Google Gemini dans les réglages (icône clé en haut) pour activer l’assistant immédiatement.'
        );
        return;
      }

      // 3. Gestion spécifique du 404 (Edge Function non déployée sur Supabase)
      if (response.status === 404) {
        if (userApiKey) {
          console.info('[AIAssistantService] Edge Function returned HTTP 404 (not deployed). Seamlessly falling back to direct client execution with BYOK...');
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
          'L’Edge Function Supabase n’est pas trouvée (HTTP 404). Renseignez votre clé API Google Gemini via l’icône clé en haut à droite pour utiliser l’assistant tout de suite !'
        );
        return;
      }

      // Autres erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Erreur serveur (${response.status})`;
        const isQuota = response.status === 429 || errorData.reason === 'window_limit' || errorData.reason === 'daily_limit';
        
        // Si l'erreur est un manque de clé sur le serveur
        if (response.status === 400 && errorMessage.toLowerCase().includes('gemini')) {
          callbacks.onError(
            'La variable GEMINI_API_KEY n’est pas encore configurée dans Supabase Secrets. Ajoutez-la dans Supabase ou renseignez votre clé dans les réglages de l’application.'
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

              if (dataStr === '[DONE]' || dataStr === '"[DONE]"') {
                break;
              }

              try {
                const data = JSON.parse(dataStr);
                // Support du format Supabase Edge Function { chunk: "..." } ou { type: "chunk", text: "..." }
                if (typeof data.chunk === 'string') {
                  callbacks.onChunk(data.chunk);
                } else if (data.type === 'chunk' && typeof data.text === 'string') {
                  callbacks.onChunk(data.text);
                } else if (Array.isArray(data.eventIds)) {
                  verifiedEventIds = data.eventIds;
                } else if (data.type === 'done') {
                  if (Array.isArray(data.verified_event_ids)) {
                    verifiedEventIds = data.verified_event_ids;
                  }
                } else if (data.type === 'error' || data.error) {
                  callbacks.onError(data.error || 'Erreur inconnue dans le flux.');
                  return;
                }
              } catch {
                // Si la ligne data: contient directement du texte brut
                if (dataStr !== '[DONE]' && !dataStr.startsWith('{')) {
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
