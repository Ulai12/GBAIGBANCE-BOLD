import { useState, useEffect } from 'react';

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

const DEFAULT_FALLBACK = 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800';

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

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setErrored(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setErrored(true);
    }
  };

  if (errored && fallbackText) {
    return (
      <div className={`flex items-center justify-center ${fallbackClassName || className}`} style={style}>
        <span className="text-sm font-bold text-gray-400">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      draggable={draggable}
      loading="lazy"
      decoding="async"
    />
  );
}
