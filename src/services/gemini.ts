/**
 * GBAIGBANCE — Service IA Serveur & Façade Gemini
 * 
 * Toutes les requêtes Gemini (textes, streaming, Live audio) sont exécutées
 * côté serveur via le SDK officiel @google/genai et relayées aux clients.
 */

import type { Event } from '@/types';
import { streamAIAssistant } from '@/services/aiAssistantService';
import { shouldShareLocationWithAssistant } from '@/services/aiSettings';
import {
  getUserGeminiApiKey,
  removeUserGeminiApiKey,
} from '@/services/aiSettings';

export {
  getUserGeminiApiKey,
  hasUserGeminiApiKey,
  removeUserGeminiApiKey,
  setUserGeminiApiKey,
} from '@/services/aiSettings';

export interface GeminiConfig {
  apiKey: string;
  enabled: boolean;
  model: string;
  enableMapsGrounding: boolean;
  temperature: number;
}

export interface GeminiModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  recommended?: boolean;
}

export const GEMINI_AVAILABLE_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini Flash',
    badge: 'Recommandé',
    description: 'Modèle rapide sélectionné selon les modèles disponibles pour votre clé',
    recommended: true,
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    name: 'Gemini Live',
    badge: 'Voix Temps Réel',
    description: 'Conversation vocale en temps réel (si activée sur le serveur)',
  },
];

/**
 * L'assistant IA est toujours actif grâce à l'infrastructure serveur dédiée.
 */
export function isGeminiActive(): boolean {
  return true;
}

export function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: getUserGeminiApiKey(),
    enabled: true,
    model: 'gemini-2.5-flash',
    enableMapsGrounding: true,
    temperature: 0.7,
  };
}

export async function saveGeminiConfigToAccount(
  ..._args: unknown[]
): Promise<GeminiConfig> {
  void _args;
  return getGeminiConfig();
}

export async function loadGeminiConfigFromAccount(): Promise<GeminiConfig> {
  return getGeminiConfig();
}

export async function syncGeminiConfigFromAccount(
  ..._args: unknown[]
): Promise<void> {
  void _args;
  // Pas d'action requise : gestion serveur
}

export function clearGeminiLocalConfig(): void {
  removeUserGeminiApiKey();
}

export async function resolveAvailableGeminiModel(): Promise<string> {
  return 'gemini-2.5-flash';
}

export async function testGeminiApiKey(): Promise<{ success: boolean; message: string; model?: string }> {
  const apiKey = getUserGeminiApiKey();
  if (apiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey },
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
        error?: { message?: string };
      };
      if (!response.ok) {
        return {
          success: false,
          message: response.status === 429
            ? 'La limite de requêtes Gemini est atteinte. Réessayez plus tard.'
            : response.status === 400 || response.status === 401 || response.status === 403
              ? 'Cette clé Gemini est invalide ou n’a pas accès à l’API Generative Language.'
              : data.error?.message || `Vérification Gemini impossible (${response.status}).`,
        };
      }

      const model = data.models?.find((candidate) =>
        candidate.supportedGenerationMethods?.includes('generateContent')
      )?.name?.replace(/^models\//, '');
      return model
        ? { success: true, message: 'Clé Gemini valide et compatible.', model }
        : { success: false, message: 'Cette clé ne donne accès à aucun modèle Gemini compatible.' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error && error.name === 'AbortError'
          ? 'La vérification de la clé Gemini a expiré.'
          : 'Impossible de vérifier la clé Gemini. Vérifiez votre connexion.',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      const data = (await res.json()) as { active?: boolean; model?: string };
      if (data.active === false) {
        return { success: false, message: 'Aucune clé Gemini par défaut n’est configurée sur le serveur.' };
      }
      return {
        success: true,
        message: 'Point d’accès IA serveur joignable. La clé serveur sera vérifiée à votre première question.',
        model: data.model,
      };
    }
    return {
      success: false,
      message: res.status === 404
        ? 'Le point de santé n’est pas publié sur ce déploiement. La clé serveur sera vérifiée à votre première question.'
        : 'Service IA temporairement indisponible',
    };
  } catch {
    return {
      success: false,
      message: 'Statut du serveur indisponible. Envoyez une question pour vérifier le service par défaut.',
    };
  }
}

export interface AskAssistantOptions {
  prompt: string;
  contextEvents?: Event[];
  currentEvent?: Event;
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * Appelle l'assistant IA serveur et retourne la réponse complète.
 */
export async function askGeminiAssistant(
  options: AskAssistantOptions
): Promise<{ text: string }> {
  const eventContext = options.currentEvent
    ? `\nContexte de l’interface (à vérifier avec get_event_details avant toute réponse) : ID ${options.currentEvent.id}, titre « ${options.currentEvent.title} ».`
    : '';
  const userLocation =
    options.userLocation && shouldShareLocationWithAssistant()
      ? { lat: options.userLocation.latitude, lng: options.userLocation.longitude }
      : null;

  return new Promise((resolve, reject) => {
    let responseText = '';
    void streamAIAssistant(
      {
        messages: [{ role: 'user', text: `${options.prompt.trim()}${eventContext}` }],
        userLocation,
      },
      {
        onChunk: (chunk) => {
          responseText += chunk;
        },
        onDone: () => {
          resolve({ text: responseText || 'Aucune réponse reçue de l’assistant.' });
        },
        onError: (message) => reject(new Error(message)),
      }
    ).catch((error: unknown) => {
      reject(error instanceof Error ? error : new Error('Erreur de communication avec l’assistant.'));
    });
  });
}
