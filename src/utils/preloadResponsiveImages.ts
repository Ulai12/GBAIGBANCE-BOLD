import { buildResponsiveImageSources } from '@/utils/imageOptimizer';

export interface ResponsiveImagePreloadOptions {
  widths?: number[];
  sizes?: string;
  dataSaver?: boolean;
  limit?: number;
}

const preloadedImageKeys = new Set<string>();

/**
 * Précharge un petit nombre d'images voisines à basse priorité.
 * L'appelant ne doit jamais attendre le téléchargement ou le décodage.
 */
export function preloadResponsiveImages(
  urls: Array<string | null | undefined>,
  {
    widths = [480, 768, 1080, 1440],
    sizes = '(max-width: 768px) 100vw, 90vw',
    dataSaver = false,
    limit = 2,
  }: ResponsiveImagePreloadOptions = {}
): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    document.visibilityState === 'hidden'
  ) {
    return;
  }

  const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))].slice(0, limit);

  uniqueUrls.forEach((url) => {
    const sources = buildResponsiveImageSources(url, widths, sizes, dataSaver);
    const cacheKey = sources.src || url;
    if (!cacheKey || preloadedImageKeys.has(cacheKey)) return;

    preloadedImageKeys.add(cacheKey);
    const image = new window.Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.sizes = sources.sizes;
    if (sources.srcSetWebp) image.srcset = sources.srcSetWebp;
    image.src = sources.src;

    image.decode().catch(() => {
      // Autorise une nouvelle tentative si le composant visible rencontre une erreur.
      preloadedImageKeys.delete(cacheKey);
    });
  });
}
