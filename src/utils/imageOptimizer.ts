/**
 * Image optimization utility for responsive images and WebP format support.
 * Automatically transforms Unsplash, Pexels, Supabase and generic image URLs
 * to deliver WebP formats with optimal resolutions, compression, and responsive srcset.
 */

export interface OptimizedImageSource {
  src: string;
  srcSetWebp: string;
  srcSetFallback: string;
  sizes: string;
}

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

/**
 * Transforms an image URL to request WebP format and specific width.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  format: 'webp' | 'original' = 'webp'
): string {
  if (!url || typeof url !== 'string') return '';

  // 1. Unsplash images
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', width.toString());
      if (format === 'webp') {
        parsed.searchParams.set('fm', 'webp');
      }
      parsed.searchParams.set('q', '80');
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  // 2. Pexels images
  if (url.includes('images.pexels.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('auto', 'compress');
      parsed.searchParams.set('cs', 'tinysrgb');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  // 3. Supabase Storage: serve direct CDN object URL safely without broken /render/ transformation
  if (url.includes('supabase.co/storage/v1/')) {
    return url;
  }

  // 4. Cloudinary images
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    try {
      const parts = url.split('/upload/');
      const formatFlag = format === 'webp' ? 'f_webp,' : '';
      return `${parts[0]}/upload/${formatFlag}w_${width},q_auto/${parts[1]}`;
    } catch {
      return url;
    }
  }

  // Fallback for data URLs or generic URLs
  return url;
}

/**
 * Checks if an image URL is from a known CDN that supports on-the-fly transformations.
 */
function isTransformableCdn(url: string): boolean {
  return (
    url.includes('images.unsplash.com') ||
    url.includes('images.pexels.com') ||
    (url.includes('cloudinary.com') && url.includes('/upload/'))
  );
}

/**
 * Builds responsive srcSet strings for both WebP and standard fallback format.
 */
export function buildResponsiveImageSources(
  url: string | null | undefined,
  widths: number[] = [320, 640, 960, 1280],
  sizes: string = DEFAULT_SIZES
): OptimizedImageSource {
  if (!url) {
    return {
      src: '',
      srcSetWebp: '',
      srcSetFallback: '',
      sizes,
    };
  }

  // Don't generate srcset for data URIs, blob URIs, or non-transformable CDNs (e.g. Supabase, generic servers)
  if (url.startsWith('data:') || url.startsWith('blob:') || !isTransformableCdn(url)) {
    return {
      src: url,
      srcSetWebp: '',
      srcSetFallback: '',
      sizes,
    };
  }

  const srcSetWebp = widths
    .map((w) => `${getOptimizedImageUrl(url, w, 'webp')} ${w}w`)
    .join(', ');

  const srcSetFallback = widths
    .map((w) => `${getOptimizedImageUrl(url, w, 'original')} ${w}w`)
    .join(', ');

  // Default src is medium size (e.g. 800w or 640w) in WebP format
  const src = getOptimizedImageUrl(url, 800, 'webp');

  return {
    src,
    srcSetWebp,
    srcSetFallback,
    sizes,
  };
}
