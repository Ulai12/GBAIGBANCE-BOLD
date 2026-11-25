import type { NavigateFunction } from 'react-router-dom';

const ROOT_TABS = new Set(['/', '/home', '/explore', '/tickets', '/favorites', '/profile']);

/**
 * Retour arrière déterministe :
 * - utilise uniquement l'index d'historique géré par React Router ;
 * - ne se fie pas au referrer, qui peut être ancien ou provenir d'une autre
 *   navigation du navigateur ;
 * - applique un fallback interne si aucune entrée SPA n'existe.
 */
export function safeNavigateBack(
  navigate: NavigateFunction,
  options?: { fallback?: string; replace?: boolean }
): void {
  const fallback = options?.fallback || '/home';
  const idx =
    typeof window !== 'undefined' && window.history.state
      ? (window.history.state as { idx?: number }).idx
      : undefined;

  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return;
  }

  navigate(fallback, { replace: options?.replace ?? true });
}

/**
 * N'accepte qu'une destination interne absolue et évite les boucles
 * vers les écrans d'authentification après connexion ou inscription.
 */
export function getSafeInternalPath(value: unknown, fallback = '/'): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F]/.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, 'https://gbaigbance.internal');
    if (url.origin !== 'https://gbaigbance.internal') return fallback;
    if (new Set(['/login', '/signup', '/forgot-password', '/otp']).has(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function isRootTabPath(pathname: string): boolean {
  return ROOT_TABS.has(pathname);
}
