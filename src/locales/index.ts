import type { Language } from '@/types';

import frCommon from '@/locales/fr/common.json';
import frEvents from '@/locales/fr/events.json';
import frAuth from '@/locales/fr/auth.json';
import frSettings from '@/locales/fr/settings.json';
import frTickets from '@/locales/fr/tickets.json';
import frProfile from '@/locales/fr/profile.json';
import frNotifications from '@/locales/fr/notifications.json';
import frOrganizer from '@/locales/fr/organizer.json';
import frOnboarding from '@/locales/fr/onboarding.json';
import enCommon from '@/locales/en/common.json';
import enEvents from '@/locales/en/events.json';
import enAuth from '@/locales/en/auth.json';
import enSettings from '@/locales/en/settings.json';
import enTickets from '@/locales/en/tickets.json';
import enProfile from '@/locales/en/profile.json';
import enNotifications from '@/locales/en/notifications.json';
import enOrganizer from '@/locales/en/organizer.json';
import enOnboarding from '@/locales/en/onboarding.json';

const translations: Record<Language, Record<string, Record<string, unknown>>> = {
  fr: {
    common: frCommon,
    events: frEvents,
    auth: frAuth,
    settings: frSettings,
    tickets: frTickets,
    profile: frProfile,
    notifications: frNotifications,
    onboarding: frOnboarding,
    organizer: frOrganizer,
  },
  en: {
    common: enCommon,
    events: enEvents,
    auth: enAuth,
    settings: enSettings,
    tickets: enTickets,
    profile: enProfile,
    notifications: enNotifications,
    onboarding: enOnboarding,
    organizer: enOrganizer,
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
