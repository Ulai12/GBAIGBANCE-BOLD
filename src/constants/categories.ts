import type { EventCategory, EventAccessType } from '@/types';

export type MainCategoryId =
  | 'cultural_artistic'
  | 'commercial_professional'
  | 'festive_nightlife'
  | 'sports'
  | 'private_family'
  | 'leisure_discovery';

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
  | 'celebrations_personnelles'
  | 'mariages_receptions'
  | 'anniversaires'
  | 'ceremonies_familiales'
  | 'evenements_vip_prives'
  // Loisirs et expériences
  | 'gaming_esport'
  | 'loisirs_sorties'
  | 'bien_etre_lifestyle';

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
        shortLabel: 'Célébrations',
        description: "Événements personnels organisés dans un cadre privé.",
        defaultLegacyCategory: 'private',
        iconName: 'Cake',
        tags: ['Célébration personnelle', 'Fête privée'],
      },
      {
        id: 'mariages_receptions',
        mainCategoryId: 'private_family',
        label: 'Mariages & Réceptions',
        shortLabel: 'Mariages',
        description: "Mariages, réceptions et fêtes de mariage réservées aux invités.",
        defaultLegacyCategory: 'private',
        iconName: 'Heart',
        tags: ['Mariage', 'Réception de mariage', 'Fiancailles', 'Wedding'],
      },
      {
        id: 'anniversaires',
        mainCategoryId: 'private_family',
        label: 'Anniversaires & Fêtes',
        shortLabel: 'Anniversaires',
        description: "Anniversaires et fêtes privées entre proches.",
        defaultLegacyCategory: 'private',
        iconName: 'Gift',
        tags: ['Anniversaire', 'Birthday', 'Fête privée'],
      },
      {
        id: 'ceremonies_familiales',
        mainCategoryId: 'private_family',
        label: 'Cérémonies familiales',
        shortLabel: 'Cérémonies',
        description: "Baptêmes, cérémonies traditionnelles et rassemblements familiaux privés.",
        defaultLegacyCategory: 'private',
        iconName: 'Users',
        tags: ['Baptême', 'Cérémonie familiale', 'Tradition', 'Fête de famille'],
      },
      {
        id: 'evenements_vip_prives',
        mainCategoryId: 'private_family',
        label: 'Événements VIP privés',
        shortLabel: 'VIP privés',
        description: "Rencontres privées sur invitation, événements VIP et réceptions intimistes.",
        defaultLegacyCategory: 'private',
        iconName: 'Lock',
        tags: ['VIP', 'Invitation', 'Lounge privé', 'Réception privée'],
      },
    ],
  },
  {
    id: 'leisure_discovery',
    label: 'Loisirs et découvertes',
    shortLabel: 'Loisirs & Découvertes',
    description: 'Jeux vidéo, expériences ludiques, sorties et activités de bien-être.',
    iconName: 'Sparkles',
    accentColor: '#06B6D4',
    subcategories: [
      {
        id: 'gaming_esport',
        mainCategoryId: 'leisure_discovery',
        label: 'Gaming & E-sport',
        shortLabel: 'Gaming',
        description: 'Tournois de jeux vidéo, rencontres gaming et compétitions e-sport.',
        defaultLegacyCategory: 'cultural',
        iconName: 'Gamepad2',
        tags: ['Call of Duty', 'FPS', 'Gaming', 'Jeux vidéo', 'E-sport', 'Tournoi gaming', 'LAN'],
      },
      {
        id: 'loisirs_sorties',
        mainCategoryId: 'leisure_discovery',
        label: 'Loisirs & Sorties',
        shortLabel: 'Loisirs',
        description: 'Activités récréatives, découvertes, sorties et expériences collectives.',
        defaultLegacyCategory: 'cultural',
        iconName: 'Compass',
        tags: ['Loisirs', 'Sortie', 'Découverte', 'Expérience', 'Activité'],
      },
      {
        id: 'bien_etre_lifestyle',
        mainCategoryId: 'leisure_discovery',
        label: 'Bien-être & Lifestyle',
        shortLabel: 'Bien-être',
        description: 'Activités de détente, bien-être, développement personnel et art de vivre.',
        defaultLegacyCategory: 'formation',
        iconName: 'Sparkles',
        tags: ['Bien-être', 'Yoga', 'Méditation', 'Lifestyle', 'Développement personnel'],
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

  const subcategory = getSubcategoryById(event.subcategory);
  const resolvedMain = subcategory?.mainCategoryId || event.main_category;

  // Les catégories principales sont les parents canoniques.
  if (getMainCategoryById(filterValue)) return resolvedMain === filterValue;

  // Une sous-catégorie ne correspond qu'à elle-même.
  if (getSubcategoryById(filterValue)) return event.subcategory === filterValue;

  // Compatibilité historique : un événement enrichi est classé selon
  // l'alias de sa sous-catégorie, jamais selon les mots de son titre.
  if (subcategory) return subcategory.defaultLegacyCategory === filterValue;

  return event.category === filterValue || event.main_category === filterValue;
}

/**
 * Métadonnées enrichies encodées de manière non-destructive dans la description
 */
export interface EventExtendedMeta {
  sub?: SubCategoryId | string | null;
  main?: MainCategoryId | string | null;
  video_url?: string | null;
  access_type?: EventAccessType;
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  external_ticket_url?: string | null;
  unlimited_capacity?: boolean;
}

/**
 * Extrait les métadonnées de sous-catégories et paramètres avancés encodés de manière non-destructive
 */
export function extractCategoryMeta(rawDescription?: string | null): {
  description: string;
  subcategory?: SubCategoryId;
  main_category?: MainCategoryId;
  video_url?: string | null;
  access_type?: EventAccessType;
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  external_ticket_url?: string | null;
  unlimited_capacity?: boolean;
} {
  if (!rawDescription) return { description: '' };
  const match = rawDescription.match(/<!--(?:event_meta|cat_meta):(.*?)(?:-->)/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const cleanDesc = rawDescription.replace(/<!--(?:event_meta|cat_meta):.*?-->/, '').trim();
      return {
        description: cleanDesc,
        subcategory: (parsed.sub || parsed.subcategory) as SubCategoryId,
        main_category: (parsed.main || parsed.main_category) as MainCategoryId,
        video_url: parsed.video_url || null,
        access_type: (parsed.access_type as EventAccessType) || 'tickets',
        whatsapp_number: parsed.whatsapp_number || null,
        whatsapp_message: parsed.whatsapp_message || null,
        external_ticket_url: parsed.external_ticket_url || null,
        unlimited_capacity: Boolean(parsed.unlimited_capacity),
      };
    } catch {
      // fallback
    }
  }
  return { description: rawDescription };
}

/**
 * Enveloppe la description avec les métadonnées de catégorie et de billetterie/vidéo
 */
export function injectCategoryMeta(
  description: string,
  sub?: string | null,
  main?: string | null,
  extra?: Partial<EventExtendedMeta>
): string {
  const meta: Record<string, unknown> = {};
  if (sub) meta.sub = sub;
  if (main) meta.main = main;
  if (extra?.video_url) meta.video_url = extra.video_url;
  if (extra?.access_type) meta.access_type = extra.access_type;
  if (extra?.whatsapp_number) meta.whatsapp_number = extra.whatsapp_number;
  if (extra?.whatsapp_message) meta.whatsapp_message = extra.whatsapp_message;
  if (extra?.external_ticket_url) meta.external_ticket_url = extra.external_ticket_url;
  if (extra?.unlimited_capacity !== undefined) meta.unlimited_capacity = extra.unlimited_capacity;

  if (Object.keys(meta).length === 0) return description;
  const tag = `<!--event_meta:${JSON.stringify(meta)}-->`;
  return `${tag}${description ? `\n${description}` : ''}`;
}

/**
 * Hydrate automatiquement les sous-catégories et catégories principales d'un événement
 */
// Supporte les types Event où subcategory et main_category peuvent être typés string | null
export function hydrateEventCategories<T extends {
  category: EventCategory;
  title?: string;
  description?: string | null;
  subcategory?: SubCategoryId | string | null;
  main_category?: MainCategoryId | string | null;
  video_url?: string | null;
  access_type?: EventAccessType;
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  external_ticket_url?: string | null;
  unlimited_capacity?: boolean;
}>(
  event: T
): T {
  const meta = extractCategoryMeta(event.description);
  let resolvedSub = event.subcategory || meta.subcategory;
  let resolvedMain = event.main_category || meta.main_category;

  // Les anciens événements n'ont pas toujours de sous-catégorie enregistrée.
  // On utilise alors les tags explicites du catalogue (ex. Call of Duty → Gaming),
  // sans déduire une catégorie à partir d'un simple alias historique trop large.
  if (!resolvedSub) {
    const sourceText = `${event.title || ''} ${meta.description || event.description || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const inferred = ALL_SUBCATEGORIES
      .map((sub) => ({
        sub,
        score: sub.tags.reduce((best, tag) => {
          const normalizedTag = tag
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('fr')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
          return normalizedTag.length >= 4 && sourceText.includes(normalizedTag)
            ? Math.max(best, normalizedTag.length)
            : best;
        }, 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    if (inferred) resolvedSub = inferred.sub.id;
  }

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
      // Les anciennes catégories "cultural" et "private" sont trop larges
      // pour leur attribuer arbitrairement une sous-catégorie précise.
      case 'cultural':
        resolvedMain = 'cultural_artistic';
        break;
      case 'private':
        resolvedMain = 'private_family';
        break;
    }
  }
  if (resolvedSub) {
    // La sous-catégorie est la source de vérité pour son unique catégorie parente.
    const foundMain = getMainCategoryForSubcategory(resolvedSub);
    if (foundMain) resolvedMain = foundMain.id;
  }

  return {
    ...event,
    description: meta.description || event.description,
    subcategory: resolvedSub,
    main_category: resolvedMain,
    video_url: event.video_url || meta.video_url || null,
    access_type: event.access_type || meta.access_type || 'tickets',
    whatsapp_number: event.whatsapp_number || meta.whatsapp_number || null,
    whatsapp_message: event.whatsapp_message || meta.whatsapp_message || null,
    external_ticket_url: event.external_ticket_url || meta.external_ticket_url || null,
    unlimited_capacity: event.unlimited_capacity ?? meta.unlimited_capacity ?? false,
  };
}
