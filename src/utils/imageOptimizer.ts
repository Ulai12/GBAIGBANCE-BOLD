/**
 * Image optimization utility for responsive images and WebP format support.
 * Automatically transforms Unsplash, Pexels, Supabase and generic image URLs
 * to deliver WebP formats with optimal resolutions, compression, and responsive srcset.
 * Supports aggressive Data Saver mode for low-bandwidth 2G/3G connections.
 */

export interface OptimizedImageSource {
  src: string;
  srcSetWebp: string;
  srcSetFallback: string;
  sizes: string;
}

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

/**
 * Transforms an image URL to request WebP/AVIF format and specific width,
 * applying aggressive compression if dataSaver is enabled.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  format: 'webp' | 'original' = 'webp',
  dataSaver: boolean = false
): string {
  if (!url || typeof url !== 'string') return '';

  const effectiveWidth = dataSaver ? Math.min(width, 480) : width;
  const quality = dataSaver ? '42' : '80';

  // 1. Unsplash images
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', effectiveWidth.toString());
      if (format === 'webp') {
        parsed.searchParams.set('fm', 'webp');
      }
      parsed.searchParams.set('q', quality);
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
      parsed.searchParams.set('w', effectiveWidth.toString());
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
      const qFlag = dataSaver ? 'q_auto:eco' : 'q_auto';
      return `${parts[0]}/upload/${formatFlag}w_${effectiveWidth},${qFlag}/${parts[1]}`;
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
  sizes: string = DEFAULT_SIZES,
  dataSaver: boolean = false
): OptimizedImageSource {
  if (!url) {
    return {
      src: '',
      srcSetWebp: '',
      srcSetFallback: '',
      sizes,
    };
  }

  // Don't generate srcset for data URIs, blob URIs, or non-transformable CDNs
  if (url.startsWith('data:') || url.startsWith('blob:') || !isTransformableCdn(url)) {
    return {
      src: url,
      srcSetWebp: '',
      srcSetFallback: '',
      sizes,
    };
  }

  const effectiveWidths = dataSaver ? [240, 480] : widths;

  const srcSetWebp = effectiveWidths
    .map((w) => `${getOptimizedImageUrl(url, w, 'webp', dataSaver)} ${w}w`)
    .join(', ');

  const srcSetFallback = effectiveWidths
    .map((w) => `${getOptimizedImageUrl(url, w, 'original', dataSaver)} ${w}w`)
    .join(', ');

  // Default src is lightweight (360w in dataSaver, 800w in standard)
  const defaultWidth = dataSaver ? 360 : 800;
  const src = getOptimizedImageUrl(url, defaultWidth, 'webp', dataSaver);

  return {
    src,
    srcSetWebp,
    srcSetFallback,
    sizes,
  };
}
