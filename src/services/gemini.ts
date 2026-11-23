/**
 * GBAIGBANCE — Service IA Serveur & Façade Gemini
 * 
 * Toutes les requêtes Gemini (textes, streaming, Live audio) sont exécutées
 * côté serveur via le SDK officiel @google/genai et relayées aux clients.
 */

import type { Event } from '@/types';
import { supabase } from '@/infrastructure/supabase';
import { getAIAssistantPreferences, shouldShareLocationWithAssistant } from '@/services/aiSettings';

export interface MapsGroundingPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: string[];
}

export interface GeminiConfig {
  apiKey: string;
  enabled: boolean;
  model: string;
  enableMapsGrounding: boolean;
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
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    badge: 'Concierge & Maps',
    description: 'Modèle principal avec Google Maps Grounding et outils temps réel',
    recommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Mode Rapide',
    description: 'Réponses ultra-rapides pour les questions directes et légères',
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
  try {
    const raw = localStorage.getItem('gbaigbance_ai_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<{ model: string; enableMapsGrounding: boolean }>;
      const validModel =
        parsed.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      return {
        apiKey: '',
        enabled: true,
        model: validModel,
        enableMapsGrounding: parsed.enableMapsGrounding !== false,
      };
    }
  } catch {
    // Fallback
  }
  return {
    apiKey: '',
    enabled: true,
    model: 'gemini-4-hydrogen',
    enableMapsGrounding: true,
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
  return getGeminiConfig().model;
}

export async function testGeminiApiKey(): Promise<{
  success: boolean;
  message: string;
  model?: string;
  fastModel?: string;
  mapsGrounding?: boolean;
}> {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: `Service IA serveur opérationnel avec ${data.model} !`,
        model: data.model,
        fastModel: data.fastModel,
        mapsGrounding: Boolean(data.mapsGrounding),
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
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  contextEvents?: Event[];
  currentEvent?: Event;
  userLocation?: { latitude: number; longitude: number } | null;
  fastMode?: boolean;
  useMapsGrounding?: boolean;
}

/**
 * Appelle l'assistant IA serveur (multi-tours + Google Maps Grounding) et retourne la réponse complète.
 */
export async function askGeminiAssistant(
  options: AskAssistantOptions
): Promise<{
  text: string;
  groundingPlaces?: MapsGroundingPlace[];
  verifiedEventIds?: string[];
  model?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: options.prompt,
        history: options.history || [],
        currentEvent: options.currentEvent,
        userLocation: options.userLocation && shouldShareLocationWithAssistant()
          ? { lat: options.userLocation.latitude, lng: options.userLocation.longitude }
          : null,
        fastMode: Boolean(options.fastMode),
        useMapsGrounding: options.useMapsGrounding !== false,
        preferences: getAIAssistantPreferences(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.text || 'Aucune réponse reçue de l’assistant.',
        groundingPlaces: Array.isArray(data.groundingPlaces) ? data.groundingPlaces : [],
        verifiedEventIds: Array.isArray(data.verifiedEventIds) ? data.verifiedEventIds : [],
        model: typeof data.model === 'string' ? data.model : undefined,
      };
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur serveur (${res.status})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de communication avec l’assistant';
    throw new Error(msg);
  }
}

export interface VenueMapsInsightsParams {
  locationName: string;
  locationAddress?: string | null;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  focus?: 'overview' | 'food' | 'transport';
}

/**
 * Interroge Gemini 4 Hydrogen avec Google Maps Grounding sur les alentours d'un lieu d'événement.
 */
export async function fetchVenueMapsInsights(
  params: VenueMapsInsightsParams
): Promise<{
  text: string;
  groundingPlaces: MapsGroundingPlace[];
  model?: string;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch('/api/ai/maps-insights', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur Google Maps IA (${res.status})`);
  }

  return {
    text: data.text || 'Aucune information Google Maps disponible pour ce lieu.',
    groundingPlaces: Array.isArray(data.groundingPlaces) ? data.groundingPlaces : [],
    model: typeof data.model === 'string' ? data.model : 'gemini-4-hydrogen',
  };
}
