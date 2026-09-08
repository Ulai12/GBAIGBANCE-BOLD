// Note: Bring-Your-Own-Key (BYOK) architecture where the user optionally enters their own Gemini API key
// stored locally on their device.
import { GoogleGenAI } from '@google/genai';
import type { Event } from '@/types';

export interface GeminiConfig {
  apiKey: string;
  enabled: boolean;
  model: string;
  enableMapsGrounding: boolean;
  temperature: number;
}

const STORAGE_KEY = 'gbaigbance_gemini_config';

const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: '',
  enabled: false,
  model: 'gemini-2.5-flash',
  enableMapsGrounding: true,
  temperature: 0.7,
};

export function getGeminiConfig(): GeminiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Dispatch a custom event so reactive components can update instantly
  window.dispatchEvent(new CustomEvent('gbaigbance_gemini_config_updated', { detail: updated }));
  return updated;
}

export function isGeminiActive(): boolean {
  const config = getGeminiConfig();
  return config.enabled && config.apiKey.trim().length > 10;
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

  if (!isGeminiActive()) {
    throw new Error('La clé API Gemini n’est pas configurée ou est désactivée.');
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey.trim() });
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
Date : ${currentEvent.start_date}
Lieu : ${currentEvent.location_name}, ${currentEvent.city}, ${currentEvent.country}
Prix : ${currentEvent.price ? currentEvent.price + ' ' + (currentEvent.currency || 'FCFA') : 'Gratuit'}
Description : ${currentEvent.description || 'N/A'}`;
  } else if (contextEvents.length > 0) {
    const list = contextEvents.slice(0, 8).map(
      (e) => `- ${e.title} (${e.category}) le ${e.start_date} à ${e.location_name}, ${e.city} [${e.price ? e.price + ' ' + (e.currency || 'FCFA') : 'Gratuit'}]`
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
