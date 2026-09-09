import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface SmartImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  fallbackText?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80';

// Global memory cache of successfully loaded image URLs to prevent re-flashing on swipes or re-renders
const LOADED_IMAGE_URLS = new Set<string>();

export function SmartImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = DEFAULT_FALLBACK,
  fallbackText,
  fallbackClassName = '',
  style,
  draggable,
}: SmartImageProps) {
  const effectiveSrc = src || fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(effectiveSrc);
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(() => (src ? LOADED_IMAGE_URLS.has(src) : false));

  useEffect(() => {
    const nextSrc = src || fallbackSrc;
    setImgSrc(nextSrc);
    setErrored(false);
    if (src && LOADED_IMAGE_URLS.has(src)) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setErrored(true);
    }
  };

  if (errored) {
    return (
      <div
        className={`relative overflow-hidden flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 p-4 text-center ${
          fallbackClassName || className
        }`}
        style={style}
      >
        <Sparkles className="w-8 h-8 text-[#6600FF]/60 dark:text-[#8B5CF6] mb-2 opacity-60" />
        <span className="text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-300 line-clamp-2">
          {fallbackText || alt || 'Gbaigbance Event'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} ${!loaded ? 'bg-black/[0.04] dark:bg-white/[0.06]' : 'transition-opacity duration-200 opacity-100'}`}
      style={style}
      onError={handleError}
      onLoad={() => {
        if (src) LOADED_IMAGE_URLS.add(src);
        setLoaded(true);
      }}
      referrerPolicy="no-referrer"
      draggable={draggable}
      loading="lazy"
      decoding="async"
    />
  );
}

