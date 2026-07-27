import type { EventCategory } from '@/types';

export const EVENT_CATEGORIES: { value: EventCategory; icon: string; color: string }[] = [
  { value: 'concert', icon: 'Music', color: 'from-[#6600FF] to-[#9D4EDD]' },
  { value: 'festival', icon: 'PartyPopper', color: 'from-[#FF6B6B] to-[#FF8E53]' },
  { value: 'conference', icon: 'Mic', color: 'from-[#0EA5E9] to-[#0284C7]' },
  { value: 'formation', icon: 'GraduationCap', color: 'from-[#10B981] to-[#059669]' },
  { value: 'exposition', icon: 'Palette', color: 'from-[#F59E0B] to-[#D97706]' },
  { value: 'spectacle', icon: 'Theater', color: 'from-[#EC4899] to-[#DB2777]' },
  { value: 'cultural', icon: 'Landmark', color: 'from-[#8B5CF6] to-[#7C3AED]' },
  { value: 'private', icon: 'Lock', color: 'from-[#64748B] to-[#475569]' },
];

export const CITIES = [
  { value: 'Lomé', country: 'TG' },
  { value: 'Cotonou', country: 'BJ' },
  { value: 'Abidjan', country: 'CI' },
  { value: 'Accra', country: 'GH' },
  { value: 'Bamako', country: 'ML' },
  { value: 'Dakar', country: 'SN' },
];

export const COUNTRY_FLAGS: Record<string, string> = {
  TG: '🇹🇬',
  BJ: '🇧🇯',
  CI: '🇨🇮',
  GH: '🇬🇭',
  ML: '🇲🇱',
  SN: '🇸🇳',
};

export const COUNTRY_NAMES: Record<string, string> = {
  TG: 'Togo',
  BJ: 'Bénin',
  CI: 'Côte d\'Ivoire',
  GH: 'Ghana',
  ML: 'Mali',
  SN: 'Sénégal',
};

export const APP_CONFIG = {
  name: 'Gbaigbance',
  tagline: 'L\'événementiel africain',
  defaultCurrency: 'XOF',
  defaultCountry: 'TG',
  defaultCity: 'Lomé',
};
