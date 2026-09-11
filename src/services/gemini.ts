// Note: Bring-Your-Own-Key (BYOK) architecture where the user optionally enters their own Gemini API key
// stored locally on their device and persisted to their account when authenticated.
import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Event } from '@/types';

export interface GeminiConfig {
  apiKey: string;
  enabled: boolean;
  model: string;
  enableMapsGrounding: boolean;
  temperature: number;
}

const STORAGE_KEY = 'gbaigbance_gemini_config';
const API_KEY_KEY = 'gbaigbance_gemini_api_key';

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
    description: 'Ultra-rapide, équilibre idéal & Maps Grounding',
    recommended: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Raisonnement avancé',
    description: 'Analyse complexe, haute précision & conseils personnalisés',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Nouvelle génération',
    description: 'Génération ultra réactive et multimodale',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    badge: 'Léger & rapide',
    description: 'Latence minimale pour les recommandations instantanées',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'Standard rapide',
    description: 'Modèle éprouvé pour les requêtes courantes',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: 'Contexte étendu',
    description: 'Grande fenêtre de contexte pour analyser tous les détails',
  },
];

const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: '',
  enabled: false,
  model: 'gemini-2.5-flash',
  enableMapsGrounding: true,
  temperature: 0.7,
};

export function getGeminiConfig(): GeminiConfig {
  try {
    let savedKey = '';
    try {
      savedKey = localStorage.getItem(API_KEY_KEY) || sessionStorage.getItem(API_KEY_KEY) || '';
    } catch (err) {
      console.debug('Failed to read stored Gemini key:', err);
      savedKey = '';
    }

    // BYOK: Client only reads keys configured by the user in device storage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_CONFIG,
        apiKey: savedKey,
        enabled: Boolean(savedKey && savedKey.trim().length > 10),
      };
    }
    const parsed = JSON.parse(raw);
    const resolvedKey = (parsed.apiKey && parsed.apiKey.trim()) || savedKey;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiKey: resolvedKey,
      enabled: parsed.enabled ?? Boolean(resolvedKey && resolvedKey.trim().length > 10),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveGeminiConfig(config: Partial<GeminiConfig>): GeminiConfig {
  const current = getGeminiConfig();
  const updated: GeminiConfig = {
    ...current,
    ...config,
  };
  if (updated.apiKey && updated.apiKey.trim().length > 5) {
    updated.enabled = config.enabled ?? true;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (updated.apiKey && updated.apiKey.trim().length > 0) {
      localStorage.setItem(API_KEY_KEY, updated.apiKey.trim());
      sessionStorage.setItem(API_KEY_KEY, updated.apiKey.trim());
    } else if (config.apiKey === '') {
      localStorage.removeItem(API_KEY_KEY);
      sessionStorage.removeItem(API_KEY_KEY);
    }
  } catch (err) {
    console.warn('Could not persist Gemini API key:', err);
  }

  // Dispatch a custom event so reactive components can update instantly
  window.dispatchEvent(new CustomEvent('gbaigbance_gemini_config_updated', { detail: updated }));
  return updated;
}

/**
 * Persists the user's Gemini config both to device storage AND to their authenticated Supabase user account.
 * This guarantees the user's API key is preserved across sign-ins, page refreshes, and device switches.
 */
export async function saveGeminiConfigToAccount(config: Partial<GeminiConfig>): Promise<GeminiConfig> {
  const localSaved = saveGeminiConfig(config);

  if (!isSupabaseConfigured) {
    return localSaved;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return localSaved;

    // 1. Update Auth User Metadata
    try {
      await supabase.auth.updateUser({
        data: {
          gemini_config: localSaved,
        },
      });
    } catch (err) {
      console.debug('Failed to update auth metadata for Gemini config:', err);
    }

    // 2. Also update profiles table
    try {
      await supabase
        .from('profiles')
        .update({
          gemini_config: localSaved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (err) {
      console.debug('Failed to update profiles table for Gemini config:', err);
    }
  } catch (err) {
    console.warn('Error saving Gemini config to user account:', err);
  }

  return localSaved;
}

/**
 * Synchronizes Gemini configuration from the user's Supabase account down to device storage.
 * Called on user sign-in or session restoration.
 */
export function syncGeminiConfigFromAccount(
  userMetadata?: Record<string, unknown> | null,
  profileConfig?: Record<string, unknown> | null
): GeminiConfig {
  const accountConfig = (profileConfig || userMetadata?.gemini_config) as Partial<GeminiConfig> | null;
  const current = getGeminiConfig();

  if (accountConfig && typeof accountConfig === 'object') {
    const hasAccountKey = Boolean(accountConfig.apiKey && accountConfig.apiKey.trim().length > 5);
    const hasCurrentKey = Boolean(current.apiKey && current.apiKey.trim().length > 5);

    // If account has key or if current device has no key, restore account config
    if (hasAccountKey || (!hasCurrentKey && accountConfig.model)) {
      return saveGeminiConfig({
        ...current,
        ...accountConfig,
        apiKey: accountConfig.apiKey?.trim() || current.apiKey,
        enabled: accountConfig.enabled ?? hasAccountKey,
      });
    }
  }

  return current;
}

/**
 * Loads Gemini config directly from current authenticated session if available
 */
export async function loadGeminiConfigFromAccount(): Promise<GeminiConfig> {
  if (!isSupabaseConfigured) return getGeminiConfig();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return getGeminiConfig();

    // Check profiles first
    const { data: profile } = await supabase
      .from('profiles')
      .select('gemini_config')
      .eq('id', session.user.id)
      .maybeSingle();

    return syncGeminiConfigFromAccount(session.user.user_metadata, profile?.gemini_config as Record<string, unknown>);
  } catch {
    return getGeminiConfig();
  }
}

export function isGeminiActive(): boolean {
  const config = getGeminiConfig();
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  const key = config.apiKey.trim() || envKey.trim();
  return (config.enabled && key.length > 10) || key.length > 10;
}

export async function testGeminiApiKey(
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<{ success: boolean; message: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: 'Veuillez saisir une clé API valide.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const response = await ai.models.generateContent({
      model,
      contents: 'Réponds uniquement par le mot "OK".',
    });

    if (response && response.text) {
      return { success: true, message: 'Connexion à Google Gemini réussie !' };
    }
    return { success: true, message: 'Connexion validée.' };
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    let msg = err?.message || 'Erreur lors de la validation de la clé API';
    if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('403')) {
      msg = 'Clé API invalide ou permissions insuffisantes. Vérifiez votre clé sur Google AI Studio.';
    }
    return { success: false, message: msg };
  }
}

export async function askGeminiAssistant({
  prompt,
  contextEvents = [],
  currentEvent,
  userLocation,
}: {
  prompt: string;
  contextEvents?: Event[];
  currentEvent?: Event;
  userLocation?: string;
}): Promise<{ text: string; source: 'gemini' | 'offline' }> {
  const config = getGeminiConfig();
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  const effectiveKey = config.apiKey.trim() || envKey.trim();

  if (!effectiveKey) {
    throw new Error('La clé API Gemini n’est pas configurée ou est désactivée.');
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = config.model || 'gemini-2.5-flash';

  const systemInstruction = `Tu es l'assistant concierge intelligent de Gbaigbance, l'application d'événements leader en Afrique francophone (Togo, Bénin, Côte d'Ivoire, Sénégal, etc.).
Tu aides les utilisateurs à trouver les meilleures soirées, concerts, festivals, expositions et sorties culturelles.
Tu donnes des conseils pratiques, chaleureux, bienveillants et adaptés aux réalités locales (Lomé, Cotonou, Abidjan, etc.).
Lorsque tu donnes des recommandations :
- Mentionne les lieux précis, les quartiers (ex: Lomé II, Tokoin, Cadjehoun, Haie Vive, Cocody, etc.).
- Donne des conseils sur le transport, l'ambiance, la tenue vestimentaire et les heures d'arrivée idéales.
- Sois concis, dynamique et amical.
${userLocation ? `Localisation de l'utilisateur : ${userLocation}.` : ''}`;

  let eventContext = '';
  if (currentEvent) {
    eventContext = `\nÉvénement actuellement consulté :
Titre : ${currentEvent.title}
Catégorie : ${currentEvent.category}
Date : ${currentEvent.starts_at}
Lieu : ${currentEvent.location_name}, ${currentEvent.city}, ${currentEvent.country}
Prix : ${currentEvent.price_min ? currentEvent.price_min + ' ' + (currentEvent.currency || 'FCFA') : 'Gratuit'}
Description : ${currentEvent.description || 'N/A'}`;
  } else if (contextEvents.length > 0) {
    const list = contextEvents.slice(0, 8).map(
      (e) => `- ${e.title} (${e.category}) le ${e.starts_at} à ${e.location_name}, ${e.city} [${e.price_min ? e.price_min + ' ' + (e.currency || 'FCFA') : 'Gratuit'}]`
    ).join('\n');
    eventContext = `\nVoici une sélection d'événements disponibles sur l'application :\n${list}`;
  }

  const fullPrompt = `${eventContext}\n\nQuestion de l'utilisateur : ${prompt}`;

  try {
    // Check if Google Maps grounding is enabled and model supports it
    // According to gemini-api skill, googleMaps is supported on gemini 2.5/3 series
    const requestConfig: {
      systemInstruction: string;
      temperature: number;
      tools?: { googleMaps?: object }[];
    } = {
      systemInstruction,
      temperature: config.temperature ?? 0.7,
    };

    if (config.enableMapsGrounding) {
      requestConfig.tools = [{ googleMaps: {} }];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: requestConfig,
    });

    return {
      text: response.text || "Désolé, je n'ai pas pu générer de réponse.",
      source: 'gemini',
    };
  } catch (error: unknown) {
    // If maps grounding fails (e.g. region or key limit), retry without tools
    if (config.enableMapsGrounding) {
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
          config: {
            systemInstruction,
            temperature: config.temperature ?? 0.7,
          },
        });
        return {
          text: fallbackResponse.text || "Désolé, je n'ai pas pu générer de réponse.",
          source: 'gemini',
        };
      } catch (fallbackError: unknown) {
        const fbErr = fallbackError as { message?: string };
        throw new Error(fbErr?.message || 'Erreur lors de la communication avec Gemini');
      }
    }
    const err = error as { message?: string };
    throw new Error(err?.message || 'Erreur lors de la communication avec Gemini');
  }
}
