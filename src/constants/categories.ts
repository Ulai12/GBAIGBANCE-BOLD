import type { EventCategory } from '@/types';

export type MainCategoryId =
  | 'cultural_artistic'
  | 'commercial_professional'
  | 'festive_nightlife'
  | 'sports'
  | 'private_family';

export type SubCategoryId =
  // Événements culturels et artistiques
  | 'concerts_spectacles'
  | 'festivals'
  | 'expositions_vernissages'
  // Événements commerciaux et professionnels
  | 'foires_salons'
  | 'conferences_seminaires'
  | 'lancements_galas'
  // Événements festifs et vie nocturne
  | 'clubbing_soirees'
  | 'fetes_carnavals'
  // Événements sportifs
  | 'competitions_matchs'
  | 'fan_zones'
  // Événements privés et familiaux
  | 'celebrations_personnelles';

export interface SubCategoryDefinition {
  id: SubCategoryId;
  mainCategoryId: MainCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  defaultLegacyCategory: EventCategory;
  iconName: string;
  tags: string[];
}

export interface MainCategoryDefinition {
  id: MainCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  accentColor: string;
  subcategories: SubCategoryDefinition[];
}

export const MAIN_CATEGORIES: MainCategoryDefinition[] = [
  {
    id: 'cultural_artistic',
    label: 'Événements culturels et artistiques',
    shortLabel: 'Culture & Arts',
    description: 'Prestations musicales, festivals, arts vivants, théâtre et galeries.',
    iconName: 'Palette',
    accentColor: '#6600FF',
    subcategories: [
      {
        id: 'concerts_spectacles',
        mainCategoryId: 'cultural_artistic',
        label: 'Concerts & Spectacles',
        shortLabel: 'Concert & Spectacle',
        description: "Prestations musicales, pièces de théâtre, représentations de danse ou d'humour.",
        defaultLegacyCategory: 'concert',
        iconName: 'Music',
        tags: ['Concert', 'Spectacle', 'Théâtre', 'Danse', 'Humour', 'Live'],
      },
      {
        id: 'festivals',
        mainCategoryId: 'cultural_artistic',
        label: 'Festivals',
        shortLabel: 'Festival',
        description: "Rassemblements de grande ampleur sur un ou plusieurs jours autour de la musique, du cinéma ou des arts.",
        defaultLegacyCategory: 'festival',
        iconName: 'PartyPopper',
        tags: ['Festival', 'Cinéma', 'Arts', 'Plein air', 'Musique'],
      },
      {
        id: 'expositions_vernissages',
        mainCategoryId: 'cultural_artistic',
        label: 'Expositions & Vernissages',
        shortLabel: 'Exposition & Vernissage',
        description: "Présentations d'œuvres d'art, de photographie ou d'histoire dans des musées ou galeries.",
        defaultLegacyCategory: 'exposition',
        iconName: 'Palette',
        tags: ['Exposition', 'Vernissage', 'Peinture', 'Photographie', 'Galerie', 'Musée'],
      },
    ],
  },
  {
    id: 'commercial_professional',
    label: 'Événements commerciaux et professionnels',
    shortLabel: 'Business & Pro',
    description: 'Salons, foires d’artisans, congrès sectoriels, masterclasses et galas.',
    iconName: 'Briefcase',
    accentColor: '#8B5CF6',
    subcategories: [
      {
        id: 'foires_salons',
        mainCategoryId: 'commercial_professional',
        label: 'Foires & Salons',
        shortLabel: 'Foire & Salon',
        description: "Expositions thématiques où entreprises et artisans exposent leurs produits directement au public ou aux professionnels.",
        defaultLegacyCategory: 'exposition',
        iconName: 'Store',
        tags: ['Foire', 'Salon', 'Commerce', 'Artisanat', 'Expo-vente', 'Entreprise'],
      },
      {
        id: 'conferences_seminaires',
        mainCategoryId: 'commercial_professional',
        label: 'Congrès, Séminaires & Conférences',
        shortLabel: 'Conférence & Séminaire',
        description: "Réunions d'échanges, de travail ou d'information entre professionnels d'un même secteur.",
        defaultLegacyCategory: 'conference',
        iconName: 'Mic',
        tags: ['Conférence', 'Congrès', 'Séminaire', 'Formation', 'Masterclass', 'Workshop'],
      },
      {
        id: 'lancements_galas',
        mainCategoryId: 'commercial_professional',
        label: 'Lancements de produits & Soirées de gala',
        shortLabel: 'Lancement & Gala',
        description: "Événements promotionnels ou cérémonies pour promouvoir une marque ou célébrer des réussites.",
        defaultLegacyCategory: 'cultural',
        iconName: 'Sparkles',
        tags: ['Lancement de produit', 'Soirée de gala', 'Prestige', 'Marque', 'Networking'],
      },
    ],
  },
  {
    id: 'festive_nightlife',
    label: 'Événements festifs et vie nocturne',
    shortLabel: 'Nuit & Fêtes',
    description: 'Clubbing, rooftops, soirées dansantes, carnavals et fêtes locales.',
    iconName: 'Flame',
    accentColor: '#EC4899',
    subcategories: [
      {
        id: 'clubbing_soirees',
        mainCategoryId: 'festive_nightlife',
        label: 'Soirées privées / Clubbing',
        shortLabel: 'Clubbing & Soirées',
        description: "Soirées dansantes en boîte de nuit, espaces privatifs ou rooftops (soirées à thème, Bring Your Own Bottle, etc.).",
        defaultLegacyCategory: 'private',
        iconName: 'Disc3',
        tags: ['Clubbing', 'Soirée dansante', 'Rooftop', 'DJ Set', 'BYOB', 'Ambiance'],
      },
      {
        id: 'fetes_carnavals',
        mainCategoryId: 'festive_nightlife',
        label: 'Fêtes traditionnelles & Carnavals',
        shortLabel: 'Carnaval & Tradition',
        description: "Rassemblements populaires marquant des fêtes locales, culturelles ou calendaires.",
        defaultLegacyCategory: 'cultural',
        iconName: 'Smile',
        tags: ['Carnaval', 'Fête traditionnelle', 'Folklore', 'Coutume', 'Fête populaire'],
      },
    ],
  },
  {
    id: 'sports',
    label: 'Événements sportifs',
    shortLabel: 'Sports & Rencontres',
    description: 'Matchs en direct, marathons, compétitions et retransmissions sur écrans géants.',
    iconName: 'Trophy',
    accentColor: '#10B981',
    subcategories: [
      {
        id: 'competitions_matchs',
        mainCategoryId: 'sports',
        label: 'Rencontres & Compétitions',
        shortLabel: 'Matchs & Tournois',
        description: "Matchs, tournois, marathons et courses automobiles.",
        defaultLegacyCategory: 'cultural',
        iconName: 'Trophy',
        tags: ['Match', 'Tournoi', 'Compétition', 'Marathon', 'Course', 'Football', 'Basketball'],
      },
      {
        id: 'fan_zones',
        mainCategoryId: 'sports',
        label: 'Fan zones',
        shortLabel: 'Fan Zone',
        description: "Espaces publics aménagés pour diffuser des compétitions sportives à grande échelle.",
        defaultLegacyCategory: 'cultural',
        iconName: 'Tv',
        tags: ['Fan Zone', 'Écran géant', 'Retransmission', 'CAN', 'Mondial', 'Supporters'],
      },
    ],
  },
  {
    id: 'private_family',
    label: 'Événements privés et familiaux',
    shortLabel: 'Privé & Célébrations',
    description: 'Mariages, anniversaires, fêtes familiales ou cérémonies privées.',
    iconName: 'Heart',
    accentColor: '#F59E0B',
    subcategories: [
      {
        id: 'celebrations_personnelles',
        mainCategoryId: 'private_family',
        label: 'Célébrations personnelles',
        shortLabel: 'Mariages & Anniversaires',
        description: "Mariages, anniversaires, fêtes familiales ou cérémonies privées.",
        defaultLegacyCategory: 'private',
        iconName: 'Cake',
        tags: ['Mariage', 'Anniversaire', 'Fête de famille', 'Baptême', 'Cérémonie privée'],
      },
    ],
  },
];

/**
 * Tous les sous-catégories aplaties pour recherche rapide
 */
export const ALL_SUBCATEGORIES: SubCategoryDefinition[] = MAIN_CATEGORIES.flatMap(
  (main) => main.subcategories
);

export function getMainCategoryById(id: string | null | undefined): MainCategoryDefinition | undefined {
  if (!id) return undefined;
  return MAIN_CATEGORIES.find((m) => m.id === id);
}

export function getSubcategoryById(id: string | null | undefined): SubCategoryDefinition | undefined {
  if (!id) return undefined;
  return ALL_SUBCATEGORIES.find((s) => s.id === id);
}

export function getMainCategoryForSubcategory(subId: string | null | undefined): MainCategoryDefinition | undefined {
  const sub = getSubcategoryById(subId);
  if (!sub) return undefined;
  return getMainCategoryById(sub.mainCategoryId);
}

/**
 * Mappage pour l'interface UI d'origine (4x2 cards sur l'accueil) :
 * Détermine si un événement correspond au filtre d'icône sélectionné
 */
export function eventMatchesCategoryFilter(
  event: {
    category: EventCategory | string;
    subcategory?: string | null;
    main_category?: string | null;
    title?: string;
    description?: string | null;
  },
  filterValue: EventCategory | string
): boolean {
  if (!filterValue) return true;

  // 1. Égalité directe de catégorie hébergée
  if (event.category === filterValue) return true;

  // 2. Mappage intelligent avec les nouvelles sous-catégories et catégories principales
  const sub = event.subcategory;
  const main = event.main_category;

  switch (filterValue) {
    case 'concert':
      return sub === 'concerts_spectacles' || Boolean(event.title?.toLowerCase().includes('concert'));
    case 'festival':
      return sub === 'festivals' || Boolean(event.title?.toLowerCase().includes('fest'));
    case 'conference':
      return sub === 'conferences_seminaires' || sub === 'foires_salons' || Boolean(event.title?.toLowerCase().includes('conf'));
    case 'formation':
      return sub === 'conferences_seminaires' || Boolean(event.title?.toLowerCase().includes('format'));
    case 'exposition':
      return sub === 'expositions_vernissages' || sub === 'foires_salons' || Boolean(event.title?.toLowerCase().includes('expo'));
    case 'spectacle':
      return sub === 'concerts_spectacles' || Boolean(event.title?.toLowerCase().includes('spectacl') || event.title?.toLowerCase().includes('humour'));
    case 'cultural':
      return (
        main === 'cultural_artistic' ||
        sub === 'fetes_carnavals' ||
        sub === 'competitions_matchs' ||
        sub === 'fan_zones'
      );
    case 'private':
      return (
        main === 'private_family' ||
        sub === 'celebrations_personnelles' ||
        sub === 'clubbing_soirees'
      );
    default:
      return event.category === filterValue || event.subcategory === filterValue || event.main_category === filterValue;
  }
}

/**
 * Extrait les métadonnées de sous-catégories encodées de manière non-destructive
 */
export function extractCategoryMeta(rawDescription?: string | null): {
  description: string;
  subcategory?: SubCategoryId;
  main_category?: MainCategoryId;
} {
  if (!rawDescription) return { description: '' };
  const match = rawDescription.match(/<!--cat_meta:(.*?)-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const cleanDesc = rawDescription.replace(/<!--cat_meta:.*?-->/, '').trim();
      return {
        description: cleanDesc,
        subcategory: parsed.sub as SubCategoryId,
        main_category: parsed.main as MainCategoryId,
      };
    } catch {
      // fallback
    }
  }
  return { description: rawDescription };
}

/**
 * Enveloppe la description avec les métadonnées de catégorie
 */
export function injectCategoryMeta(description: string, sub?: string | null, main?: string | null): string {
  if (!sub && !main) return description;
  const tag = `<!--cat_meta:${JSON.stringify({ sub, main })}-->`;
  return `${tag}${description ? `\n${description}` : ''}`;
}

/**
 * Hydrate automatiquement les sous-catégories et catégories principales d'un événement
 */
export function hydrateEventCategories<T extends { category: EventCategory; description?: string | null; subcategory?: SubCategoryId | null; main_category?: MainCategoryId | null }>(
  event: T
): T {
  const { description, subcategory, main_category } = extractCategoryMeta(event.description);
  let resolvedSub = event.subcategory || subcategory;
  let resolvedMain = event.main_category || main_category;

  if (!resolvedSub) {
    switch (event.category) {
      case 'concert':
        resolvedSub = 'concerts_spectacles';
        resolvedMain = 'cultural_artistic';
        break;
      case 'festival':
        resolvedSub = 'festivals';
        resolvedMain = 'cultural_artistic';
        break;
      case 'exposition':
        resolvedSub = 'expositions_vernissages';
        resolvedMain = 'cultural_artistic';
        break;
      case 'conference':
      case 'formation':
        resolvedSub = 'conferences_seminaires';
        resolvedMain = 'commercial_professional';
        break;
      case 'spectacle':
        resolvedSub = 'concerts_spectacles';
        resolvedMain = 'cultural_artistic';
        break;
      case 'cultural':
        resolvedSub = 'fetes_carnavals';
        resolvedMain = 'cultural_artistic';
        break;
      case 'private':
        resolvedSub = 'clubbing_soirees';
        resolvedMain = 'festive_nightlife';
        break;
    }
  }
  if (!resolvedMain && resolvedSub) {
    const foundMain = getMainCategoryForSubcategory(resolvedSub);
    if (foundMain) resolvedMain = foundMain.id;
  }

  return {
    ...event,
    description: description || event.description,
    subcategory: resolvedSub,
    main_category: resolvedMain,
  };
}
