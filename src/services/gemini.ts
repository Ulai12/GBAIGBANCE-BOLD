/**
 * GBAIGBANCE — Service IA Cloud & Hybrid Key Facade
 * 
 * L'assistant IA fonctionne en mode hybride :
 * 1. Mode Serveur Cloud (Supabase Edge Function) :
 *    - Si l'Edge Function est déployée, elle traite la requête côté serveur.
 *    - Si l'utilisateur fournit sa propre clé (BYOK), celle-ci est envoyée via l'en-tête `x-gemini-api-key`
 *      pour utiliser son quota personnel sur le serveur.
 * 2. Mode Direct (Secours / Sans serveur) :
 *    - Si l'Edge Function n'est pas encore déployée (HTTP 404), le client utilise
 *      la clé API Gemini fournie par l'utilisateur directement avec les outils en lecture seule.
 */

import { streamAIAssistant } from '@/services/aiAssistantService';
import type { Event } from '@/types';
import { safeFetch } from '@/utils/safeFetch';

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
    badge: 'Recommandé',
    description: 'Modèle ultra-rapide optimisé pour la billetterie et le streaming',
    recommended: true,
  },
];

const API_KEY_KEY = 'gbaigbance_gemini_api_key';

export function getUserGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(API_KEY_KEY);
      if (stored && stored.trim()) return stored.trim();
    } catch {
      // Ignorer
    }
  }
  return (
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    (import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY as string) ||
    (import.meta.env.GEMINI_API_KEY as string) ||
    ''
  );
}

export function setUserGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (key && key.trim()) {
        localStorage.setItem(API_KEY_KEY, key.trim());
      } else {
        localStorage.removeItem(API_KEY_KEY);
      }
      window.dispatchEvent(new CustomEvent('gbaigbance_gemini_config_updated'));
    } catch {
      // Ignorer
    }
  }
}

export function removeUserGeminiApiKey(): void {
  setUserGeminiApiKey('');
}

export function hasUserGeminiApiKey(): boolean {
  return Boolean(getUserGeminiApiKey());
}

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
  partial: Partial<GeminiConfig>
): Promise<GeminiConfig> {
  if (partial.apiKey !== undefined) {
    setUserGeminiApiKey(partial.apiKey);
  }
  return getGeminiConfig();
}

export async function loadGeminiConfigFromAccount(): Promise<GeminiConfig> {
  return getGeminiConfig();
}

export async function syncGeminiConfigFromAccount(): Promise<void> {
  // Sync
}

export function clearGeminiLocalConfig(): void {
  removeUserGeminiApiKey();
}

const resolvedModelsMap = new Map<string, string>();

/**
 * Détecte dynamiquement le modèle Gemini disponible et supporté par la clé API de l'utilisateur.
 * Évite les erreurs 404 (Requested entity was not found) lorsque certains modèles ne sont pas activés sur la clé.
 */
export async function resolveAvailableGeminiModel(apiKey: string): Promise<string> {
  const trimmed = apiKey.trim();
  if (resolvedModelsMap.has(trimmed)) {
    return resolvedModelsMap.get(trimmed)!;
  }

  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (listRes.ok) {
      const data = await listRes.json();
      const models = data.models || [];
      const supported = models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map((m: { name: string }) => m.name.replace(/^models\//, ''));

      for (const cand of candidateModels) {
        if (supported.includes(cand)) {
          resolvedModelsMap.set(trimmed, cand);
          return cand;
        }
      }

      const anyFlash = supported.find((n: string) => n.includes('flash'));
      if (anyFlash) {
        resolvedModelsMap.set(trimmed, anyFlash);
        return anyFlash;
      }

      if (supported.length > 0) {
        resolvedModelsMap.set(trimmed, supported[0]);
        return supported[0];
      }
    }
  } catch {
    // Si l'endpoint de liste n'est pas accessible, on teste directement les modèles candidats
  }

  for (const cand of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cand}:generateContent?key=${trimmed}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (testRes.ok) {
        resolvedModelsMap.set(trimmed, cand);
        return cand;
      }
    } catch {
      // Suivant
    }
  }

  // Modèle le plus largement déployé par défaut
  const fallback = 'gemini-1.5-flash';
  resolvedModelsMap.set(trimmed, fallback);
  return fallback;
}

export async function testGeminiApiKey(key?: string): Promise<{ success: boolean; message: string; model?: string }> {
  const activeKey = key?.trim() || getUserGeminiApiKey();
  if (!activeKey) {
    return {
      success: false,
      message: 'Veuillez saisir une clé API Gemini pour tester.',
    };
  }

  try {
    resolvedModelsMap.delete(activeKey);
    const model = await resolveAvailableGeminiModel(activeKey);

    const res = await safeFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Bonjour' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        timeoutMs: 8000,
        retries: 0,
      }
    );

    if (res.ok) {
      return {
        success: true,
        message: `Clé API validée avec succès avec le modèle ${model} !`,
        model,
      };
    }

    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      message: err.error?.message || `Erreur Google AI (${res.status})`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Impossible de contacter Google AI';
    return { success: false, message: msg };
  }
}

export interface AskAssistantOptions {
  prompt: string;
  contextEvents?: Event[];
  currentEvent?: Event;
  userLocation?: { latitude: number; longitude: number } | null;
}

/**
 * Appelle l'assistant IA et retourne la réponse complète.
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
