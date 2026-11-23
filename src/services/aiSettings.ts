import {
  DEFAULT_AI_ASSISTANT_PREFERENCES,
  normalizeAIAssistantPreferences,
  type AIAssistantPreferences,
} from '../constants/aiPreferences';

const AI_SETTINGS_STORAGE_KEY = 'gbaigbance_ai_settings_v1';
const GEMINI_API_KEY_STORAGE_KEY = 'gbaigbance_gemini_api_key_v1';

/**
 * Gemini keys stay on this device and are sent only to the AI endpoint in a
 * request header. They are never stored in the user's profile or request body.
 */
export function getUserGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function setUserGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') throw new Error('Le stockage local est indisponible.');
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    removeUserGeminiApiKey();
    return;
  }
  window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, normalizedKey);
}

export function removeUserGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}

export function hasUserGeminiApiKey(): boolean {
  return Boolean(getUserGeminiApiKey());
}

/**
 * Read the user's explicit location sharing preference at send time so changes
 * made in AI settings apply to the next assistant request without a page reload.
 */
function readStoredSettings(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    const rawSettings = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!rawSettings) return {};
    const settings: unknown = JSON.parse(rawSettings);
    return settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function getAIAssistantPreferences(): AIAssistantPreferences {
  return normalizeAIAssistantPreferences({
    ...DEFAULT_AI_ASSISTANT_PREFERENCES,
    ...readStoredSettings(),
  });
}

export function shouldShareLocationWithAssistant(): boolean {
  const shareLocation = readStoredSettings().shareLocation;
  return typeof shareLocation === 'boolean' ? shareLocation : true;
}
