import type { NavigateFunction } from 'react-router-dom';

const ROOT_TABS = new Set(['/', '/home', '/explore', '/tickets', '/favorites', '/profile']);

/**
 * Retour arriere robuste :
 * - history.back si une entree interne existe
 * - sinon fallback vers /home (ou fallback fourni)
 * Evite les pages blanches quand navigate(-1) sort de l'app.
 */
export function safeNavigateBack(
  navigate: NavigateFunction,
  options?: { fallback?: string; replace?: boolean }
): void {
  const fallback = options?.fallback || '/home';
  try {
    const idx =
      typeof window !== 'undefined' && window.history.state
        ? (window.history.state as { idx?: number }).idx
        : undefined;

    // React Router v6+ stocke souvent idx dans history.state
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }

    // Fallback: si referrer meme origine et pas un tab racine
    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          const path = ref.pathname || '/';
          if (!ROOT_TABS.has(path) || path !== window.location.pathname) {
            navigate(-1);
            return;
          }
        }
      } catch {
        // ignore invalid referrer
      }
    }
  } catch {
    // ignore
  }

  navigate(fallback, { replace: options?.replace ?? true });
}

export function isRootTabPath(pathname: string): boolean {
  return ROOT_TABS.has(pathname);
}
