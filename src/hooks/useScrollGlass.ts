import { useState, useEffect } from 'react';

/**
 * GBAIGBANCE — Adaptive Liquid Glass Scroll Hook
 * 
 * Tracks viewport scroll position to dynamically scale backdrop blur,
 * saturation, specular borders, and elevation on sticky headers.
 */
export function useScrollGlass(threshold = 12) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      setScrollY(y);
      setIsScrolled(y > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { isScrolled, scrollY };
}
