import {
  DEFAULT_AI_ASSISTANT_PREFERENCES,
  normalizeAIAssistantPreferences,
  type AIAssistantPreferences,
} from '@/constants/aiPreferences';

const AI_SETTINGS_STORAGE_KEY = 'gbaigbance_ai_settings_v1';

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
