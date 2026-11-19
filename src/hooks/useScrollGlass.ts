import { useState, useEffect } from 'react';

/**
 * Suit un seuil de défilement sans provoquer de rendu React à chaque pixel.
 */
export function useScrollGlass(threshold = 12) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > threshold;
      setIsScrolled((current) => (current === next ? current : next));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { isScrolled };
}
