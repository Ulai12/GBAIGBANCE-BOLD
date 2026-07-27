import type { Language } from '@/types';

import frCommon from '@/locales/fr/common.json';
import frEvents from '@/locales/fr/events.json';
import frAuth from '@/locales/fr/auth.json';
import frSettings from '@/locales/fr/settings.json';
import enCommon from '@/locales/en/common.json';
import enEvents from '@/locales/en/events.json';
import enAuth from '@/locales/en/auth.json';
import enSettings from '@/locales/en/settings.json';

const translations: Record<Language, Record<string, Record<string, unknown>>> = {
  fr: {
    common: frCommon,
    events: frEvents,
    auth: frAuth,
    settings: frSettings,
  },
  en: {
    common: enCommon,
    events: enEvents,
    auth: enAuth,
    settings: enSettings,
  },
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function translate(lang: Language, domain: string, key: string): string {
  const domainTranslations = translations[lang]?.[domain];
  if (!domainTranslations) return key;
  return getNestedValue(domainTranslations, key);
}

export { translations };
