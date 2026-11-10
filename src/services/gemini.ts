/**
 * GBAIGBANCE — Service IA Serveur & Façade Gemini
 * 
 * Toutes les requêtes Gemini (textes, streaming, Live audio) sont exécutées
 * côté serveur via le SDK officiel @google/genai et relayées aux clients.
 */

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
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Serveur Actif',
    description: 'Modèle officiel ultra-rapide optimisé pour le concierge et la billetterie',
    recommended: true,
  },
  {
    id: 'gemini-3.8-live',
    name: 'Gemini 3.8 Live',
    badge: 'Voix Temps Réel',
    description: 'Mode conversation vocale interactive basse latence via WebSocket',
  },
];

export function getUserGeminiApiKey(): string {
  return '';
}

export function setUserGeminiApiKey(..._args: unknown[]): void {
  void _args;
  // L'authentification et les clés sont gérées côté serveur
}

export function removeUserGeminiApiKey(): void {
  // Géré côté serveur
}

export function hasUserGeminiApiKey(): boolean {
  return false;
}

/**
 * L'assistant IA est toujours actif grâce à l'infrastructure serveur dédiée.
 */
export function isGeminiActive(): boolean {
  return true;
}

export function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: '',
    enabled: true,
    model: 'gemini-3.8-flash',
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
  // Géré côté serveur
}

export async function resolveAvailableGeminiModel(): Promise<string> {
  return 'gemini-3.8-flash';
}

export async function testGeminiApiKey(): Promise<{ success: boolean; message: string; model?: string }> {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: `Service IA serveur opérationnel avec ${data.model} !`,
        model: data.model,
      };
    }
    return {
      success: false,
      message: 'Service IA temporairement indisponible',
    };
  } catch {
    return {
      success: false,
      message: 'Impossible de joindre le serveur IA',
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
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        currentEvent: options.currentEvent,
        userLocation: options.userLocation
          ? { lat: options.userLocation.latitude, lng: options.userLocation.longitude }
          : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { text: data.text || 'Aucune réponse reçue de l’assistant.' };
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur serveur (${res.status})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de communication avec l’assistant';
    return { text: `Désolé, une erreur est survenue : ${msg}` };
  }
}
