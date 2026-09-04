import type { EventCategory } from '@/types';

export const EVENT_CATEGORIES: { value: EventCategory; icon: string; color: string }[] = [
  { value: 'concert', icon: 'Music', color: 'from-[#6600FF] to-[#9333EA]' },
  { value: 'festival', icon: 'PartyPopper', color: 'from-[#8B5CF6] to-[#A855F7]' },
  { value: 'conference', icon: 'Mic', color: 'from-[#7C3AED] to-[#6600FF]' },
  { value: 'formation', icon: 'GraduationCap', color: 'from-[#9333EA] to-[#8B5CF6]' },
  { value: 'exposition', icon: 'Palette', color: 'from-[#A855F7] to-[#7C3AED]' },
  { value: 'spectacle', icon: 'Theater', color: 'from-[#6600FF] to-[#8B5CF6]' },
  { value: 'cultural', icon: 'Landmark', color: 'from-[#8B5CF6] to-[#7C3AED]' },
  { value: 'private', icon: 'Lock', color: 'from-[#7C3AED] to-[#9333EA]' },
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
