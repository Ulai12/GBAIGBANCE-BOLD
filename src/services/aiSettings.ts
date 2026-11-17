const AI_SETTINGS_STORAGE_KEY = 'gbaigbance_ai_settings_v1';

/**
 * Read the user's explicit location sharing preference at send time so changes
 * made in AI settings apply to the next assistant request without a page reload.
 */
export function shouldShareLocationWithAssistant(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const rawSettings = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!rawSettings) return true;

    const settings = JSON.parse(rawSettings) as { shareLocation?: unknown };
    return typeof settings.shareLocation === 'boolean' ? settings.shareLocation : true;
  } catch {
    return true;
  }
}
