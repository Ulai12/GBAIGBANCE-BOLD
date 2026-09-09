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
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setErrored(false);
    setLoaded(false);
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
        className={`relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-[#2E1A47] via-[#1E1430] to-[#120B1E] text-white/70 p-4 text-center ${
          fallbackClassName || className
        }`}
        style={style}
      >
        <Sparkles className="w-8 h-8 text-[#8B5CF6] mb-2 opacity-60 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide text-white/80 line-clamp-2">
          {fallbackText || alt || 'Gbaigbance Event'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} ${!loaded ? 'bg-gradient-to-br from-[#2E1A47] to-[#1E1430]' : ''}`}
      style={style}
      onError={handleError}
      onLoad={() => setLoaded(true)}
      referrerPolicy="no-referrer"
      draggable={draggable}
      loading="lazy"
      decoding="async"
    />
  );
}
