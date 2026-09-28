/**
 * GBAIGBANCE - Deterministic Default Assets Utility
 * 
 * Génère des avatars par défaut avec initiales stylisées (ex: JULAI -> JU, Hill blo -> HB)
 * et une couverture d'événement noire élégante avec texte en extra ultra bold (GBAIGBAINCE).
 */

// Palettes d'initiales inspirées du design Apple Human Interface Guidelines
const AVATAR_PALETTES = [
  { c1: '#1E1B4B', c2: '#0F172A', text: '#FFFFFF' }, // Midnight Obsidian
  { c1: '#4F46E5', c2: '#3730A3', text: '#FFFFFF' }, // Indigo Royal
  { c1: '#6600FF', c2: '#4338CA', text: '#FFFFFF' }, // Signature Gbaigbance Purple
  { c1: '#0F766E', c2: '#115E59', text: '#FFFFFF' }, // Deep Teal
  { c1: '#BE123C', c2: '#881337', text: '#FFFFFF' }, // Vivid Ruby
  { c1: '#C2410C', c2: '#9A3412', text: '#FFFFFF' }, // Warm Amber
  { c1: '#15803D', c2: '#14532D', text: '#FFFFFF' }, // Forest Green
  { c1: '#18181B', c2: '#09090B', text: '#FFFFFF' }, // Dark Graphite
];

/**
 * Calcule les initiales de l'utilisateur :
 * - Si le nom comporte plusieurs mots (ex: "Hill blo", "Koffi Mensah") -> 1ère lettre du 1er mot + 1ère lettre du 2e mot ("HB", "KM")
 * - Si le nom comporte un seul mot (ex: "JULAI") -> les 2 premières lettres ("JU")
 * - En cas de nom vide -> "GB"
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name) return 'GB';
  const clean = name.trim();
  if (!clean) return 'GB';

  // Découpage par espace ou tiret
  const words = clean.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  // Mot unique : prend les 2 premières lettres si possible
  if (words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words[0].toUpperCase();
}

/**
 * Génère un avatar SVG vectoriel Data-URI net avec les initiales exactes de l'utilisateur
 */
export function createInitialsAvatarSvg(name?: string | null, seed?: string | null, role?: string): string {
  const initials = getAvatarInitials(name);
  const hashKey = seed || name || 'gba';
  const palette = role === 'artist' 
    ? { c1: '#7C3AED', c2: '#4C1D95', text: '#FFFFFF' }
    : role === 'organizer'
    ? { c1: '#EA580C', c2: '#9A3412', text: '#FFFFFF' }
    : AVATAR_PALETTES[hashString(hashKey) % AVATAR_PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <linearGradient id="avGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.c1}" />
        <stop offset="100%" stop-color="${palette.c2}" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#avGrad)" />
    <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-size="62" font-weight="900" fill="${palette.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe?: string | null): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Génère une couverture noire élégante avec texte en extra ultra bold (style Apple).
 * Affiche le nom complet fourni (titre d'événement, nom d'artiste ou d'organisation)
 * ou "GBAIGBAINCE" par défaut.
 */
export function createDefaultEventCoverSvg(title?: string | null, subtitle?: string | null): string {
  const rawTitle = (title && title.trim()) ? title.trim() : 'GBAIGBAINCE';
  const cleanTitle = escapeXml(rawTitle.toUpperCase());
  const cleanSub = escapeXml((subtitle && subtitle.trim()) ? subtitle.trim() : 'EXPÉRIENCES & ÉVÉNEMENTS AFRO');

  // Ajustement dynamique de la taille de police pour que le nom complet s'affiche parfaitement en très grand
  let fontSize = 110;
  let letterSpacing = 8;
  if (rawTitle.length > 24) {
    fontSize = 54;
    letterSpacing = 2;
  } else if (rawTitle.length > 16) {
    fontSize = 70;
    letterSpacing = 4;
  } else if (rawTitle.length > 10) {
    fontSize = 88;
    letterSpacing = 6;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="darkCenter" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stop-color="#141418" stop-opacity="0.9"/>
        <stop offset="65%" stop-color="#070709" stop-opacity="0.98"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#EDEDED"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="22" flood-color="#000000" flood-opacity="0.95"/>
      </filter>
    </defs>

    <!-- Fond noir profond avec texture Apple -->
    <rect width="1200" height="675" fill="#000000"/>
    <rect width="1200" height="675" fill="url(#darkCenter)"/>

    <!-- Lignes de texture minimalistes -->
    <line x1="120" y1="210" x2="1080" y2="210" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>
    <line x1="120" y1="465" x2="1080" y2="465" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>

    <!-- Badge supérieur discret (sans badge de certification) -->
    <g transform="translate(600, 160)">
      <rect x="-120" y="-16" width="240" height="32" rx="16" fill="#18181B" stroke="#27272A" stroke-width="1"/>
      <circle cx="-90" cy="0" r="4.5" fill="#6600FF"/>
      <text x="12" y="4" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="12" font-weight="700" fill="#A1A1AA" letter-spacing="3" text-anchor="middle">GBAIGBANCE</text>
    </g>

    <!-- Texte Central Extra Ultra Bold avec nom complet -->
    <text x="50%" y="345" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Impact', 'Arial Black', sans-serif" font-size="${fontSize}" font-weight="900" fill="url(#textGrad)" text-anchor="middle" dominant-baseline="middle" letter-spacing="${letterSpacing}" filter="url(#glow)">${cleanTitle}</text>

    <!-- Sous-titre officiel élégant -->
    <text x="50%" y="420" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="16" font-weight="700" fill="#71717A" text-anchor="middle" dominant-baseline="middle" letter-spacing="5">${cleanSub}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashString(str: string): number {
  let hash = 0;
  if (!str) return 0;
  const clean = str.trim().toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Retourne un avatar par défaut avec initiales vectorielles (ex: JULAI -> JU, Hill blo -> HB).
 */
export function getDefaultUserAvatar(idOrName: string, role?: string, entityId?: string | null): string {
  const seed = (entityId || idOrName || 'user').trim();
  return createInitialsAvatarSvg(idOrName, seed, role);
}

/**
 * Helper explicite pour les participants (initiales)
 */
export function getDefaultParticipantAvatar(idOrName: string): string {
  return getDefaultUserAvatar(idOrName, 'participant');
}

/**
 * Helper explicite pour les artistes (initiales)
 */
export function getDefaultArtistAvatar(idOrName: string): string {
  return getDefaultUserAvatar(idOrName, 'artist');
}

/**
 * Helper explicite pour les organisations (initiales)
 */
export function getDefaultOrgAvatar(idOrName: string): string {
  return getDefaultUserAvatar(idOrName, 'organizer');
}

/**
 * Retourne la couverture d'événement noire par défaut avec texte en extra ultra bold.
 * Affiche le titre complet de l'événement si disponible.
 */
export function getDefaultEventCover(): string;
export function getDefaultEventCover(eventId?: string | null, category?: string | null, title?: string | null): string;
export function getDefaultEventCover(...args: unknown[]): string {
  const title = typeof args[2] === 'string' ? args[2] : typeof args[0] === 'string' && isNaN(Number(args[0])) && !args[0].includes('-') ? args[0] : null;
  const category = typeof args[1] === 'string' ? args[1] : null;
  return createDefaultEventCoverSvg(title, category ? `${category.toUpperCase()} • OFFICIEL` : undefined);
}

/**
 * Retourne la couverture d'artiste par défaut en style noir extra ultra bold avec le nom complet.
 */
export function getDefaultArtistCover(artistId: string, artistName?: string | null): string {
  return createDefaultEventCoverSvg(artistName || 'ARTISTE', 'ARTISTE OFFICIEL');
}

/**
 * Retourne la couverture d'organisation par défaut en style noir extra ultra bold avec le nom complet.
 */
export function getDefaultOrgCover(orgId: string, orgName?: string | null): string {
  return createDefaultEventCoverSvg(orgName || 'ORGANISATEUR', 'ORGANISATION OFFICIELLE');
}
