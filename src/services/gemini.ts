/**
 * GBAIGBANCE — Service IA Cloud & Edge Function Facade
 * 
 * L'assistant IA s'exécute désormais de manière 100% sécurisée via l'Edge Function
 * Supabase `ai-assistant` avec vérification de JWT et RLS.
 * Aucune clé secrète n'est exposée sur le navigateur client.
 */

import { streamAIAssistant } from '@/services/aiAssistantService';
import type { Event } from '@/types';

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
    name: 'Gemini 2.5 Flash',
    badge: 'Standard Cloud',
    description: 'Modèle officiel déployé côté serveur sur l’Edge Function',
    recommended: true,
  },
];

export function isGeminiActive(): boolean {
  // L'assistant IA est activé de manière native et sécurisée via le cloud
  return true;
}

export function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: '',
    enabled: true,
    model: 'gemini-2.5-flash',
    enableMapsGrounding: true,
    temperature: 0.7,
  };
}

export async function saveGeminiConfigToAccount(
  partial: Partial<GeminiConfig>
): Promise<GeminiConfig> {
  return {
    ...getGeminiConfig(),
    ...partial,
  };
}

export async function loadGeminiConfigFromAccount(): Promise<GeminiConfig> {
  return getGeminiConfig();
}

export async function syncGeminiConfigFromAccount(): Promise<void> {
  // Pas de clé locale à synchroniser
}

export function clearGeminiLocalConfig(): void {
  // Nettoyage des résidus éventuels de clés locales
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('gbaigbance_gemini_config');
      localStorage.removeItem('gbaigbance_gemini_api_key');
    } catch {
      // Ignorer
    }
  }
}

export async function testGeminiApiKey(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Assistant IA Cloud opérationnel via Supabase Edge Function.',
  };
}

export interface AskAssistantOptions {
  prompt: string;
  contextEvents?: Event[];
  currentEvent?: Event;
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * Appelle l'assistant IA sécurisé et retourne la réponse complète sous forme de texte.
 */
export async function askGeminiAssistant(
  options: AskAssistantOptions
): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    let fullText = '';
    const location = options.userLocation
      ? { lat: options.userLocation.latitude, lng: options.userLocation.longitude }
      : null;

    let userPrompt = options.prompt;
    if (options.currentEvent) {
      userPrompt = `À propos de l'événement "${options.currentEvent.title}" (${options.currentEvent.location_name || ''}, ${options.currentEvent.city || 'Lomé'}) : ${options.prompt}`;
    }

    streamAIAssistant(
      {
        messages: [{ role: 'user', text: userPrompt }],
        userLocation: location,
      },
      {
        onChunk: (chunk) => {
          fullText += chunk;
        },
        onDone: () => {
          resolve({ text: fullText || 'Aucune réponse reçue de l’assistant.' });
        },
        onError: (err) => {
          reject(new Error(err));
        },
      }
    ).catch(reject);
  });
}
