import type { EventCategory } from '@/types';

export const EVENT_CATEGORIES: { value: EventCategory; label: string; icon: string; color: string }[] = [
  { value: 'concert', label: 'Concert', icon: 'Music', color: 'from-[#6600FF] to-[#9333EA]' },
  { value: 'festival', label: 'Festival', icon: 'PartyPopper', color: 'from-[#8B5CF6] to-[#A855F7]' },
  { value: 'conference', label: 'Conférence', icon: 'Mic', color: 'from-[#7C3AED] to-[#6600FF]' },
  { value: 'formation', label: 'Formation', icon: 'GraduationCap', color: 'from-[#9333EA] to-[#8B5CF6]' },
  { value: 'exposition', label: 'Exposition', icon: 'Palette', color: 'from-[#A855F7] to-[#7C3AED]' },
  { value: 'spectacle', label: 'Spectacle', icon: 'Theater', color: 'from-[#6600FF] to-[#8B5CF6]' },
  { value: 'cultural', label: 'Culturel', icon: 'Landmark', color: 'from-[#8B5CF6] to-[#7C3AED]' },
  { value: 'private', label: 'Privé', icon: 'Lock', color: 'from-[#7C3AED] to-[#9333EA]' },
];

export const EVENT_SUBCATEGORIES: Record<EventCategory, { id: string; label: string }[]> = {
  concert: [
    { id: 'afrobeats', label: 'Afrobeats & Amapiano' },
    { id: 'hiphop_rap', label: 'Rap & Hip-Hop' },
    { id: 'gospel', label: 'Gospel & Louange' },
    { id: 'jazz_soul', label: 'Jazz & Soul' },
    { id: 'electro_dj', label: 'Électro & DJ Set' },
    { id: 'reggae', label: 'Reggae & Dancehall' },
    { id: 'acoustique', label: 'Acoustique & Live Band' },
    { id: 'traditionnel', label: 'Musique Traditionnelle' },
  ],
  festival: [
    { id: 'musique', label: 'Festival de Musique' },
    { id: 'arts_culture', label: 'Arts & Folklore' },
    { id: 'gastronomie', label: 'Gastronomie & Street Food' },
    { id: 'danse', label: 'Danse & Carnavals' },
    { id: 'cinema_mode', label: 'Cinéma & Mode' },
  ],
  conference: [
    { id: 'tech_ia', label: 'Tech, IA & Innovation' },
    { id: 'business', label: 'Business & Entrepreneuriat' },
    { id: 'dev_perso', label: 'Développement Personnel' },
    { id: 'sante', label: 'Santé & Bien-être' },
    { id: 'leadership', label: 'Leadership & Société' },
  ],
  formation: [
    { id: 'masterclass', label: 'Masterclass VIP' },
    { id: 'workshop', label: 'Atelier Pratique' },
    { id: 'bootcamp', label: 'Bootcamp Intensif' },
    { id: 'certification', label: 'Séminaire & Certification' },
  ],
  exposition: [
    { id: 'art_visuel', label: 'Arts Visuels & Peinture' },
    { id: 'photo', label: 'Photographie' },
    { id: 'mode_design', label: 'Mode & Design' },
    { id: 'artisanat', label: 'Artisanat d’Art & Sculpture' },
  ],
  spectacle: [
    { id: 'standup', label: 'Stand-up & Humour' },
    { id: 'theatre', label: 'Théâtre & Comédie' },
    { id: 'musical', label: 'Comédie Musicale' },
    { id: 'cirque_magie', label: 'Cirque & Magie' },
  ],
  cultural: [
    { id: 'tradition', label: 'Fête Traditionnelle & Cérémonie' },
    { id: 'patrimoine', label: 'Patrimoine & Histoire' },
    { id: 'conte_poesie', label: 'Conte & Poésie' },
    { id: 'communaute', label: 'Rencontre Communautaire' },
  ],
  private: [
    { id: 'vip_lounge', label: 'Soirée VIP & Lounge' },
    { id: 'anniversaire', label: 'Anniversaire & Célébration' },
    { id: 'mariage', label: 'Mariage & Réception' },
    { id: 'afterwork', label: 'Afterwork & Networking Privé' },
  ],
};

export function getCategorySubcategories(category: EventCategory) {
  return EVENT_SUBCATEGORIES[category] || [];
}

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

export const COUNTRIES = [
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
];

export const APP_CONFIG = {
  name: 'Gbaigbance',
  tagline: 'L\'événementiel africain',
  defaultCurrency: 'XOF',
  defaultCountry: 'TG',
  defaultCity: 'Lomé',
};
