import { useState, useEffect } from 'react';

export interface ExtractedPalette {
  dominant: string;
  secondary: string;
  accent: string;
  isDark: boolean;
  textColor: string;
  subtextColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const DEFAULT_PALETTE: ExtractedPalette = {
  dominant: '#0B0B14',
  secondary: '#1A103C',
  accent: '#6600FF',
  isDark: true,
  textColor: '#FFFFFF',
  subtextColor: 'rgba(255, 255, 255, 0.7)',
  badgeBg: 'rgba(102, 0, 255, 0.2)',
  badgeBorder: 'rgba(102, 0, 255, 0.4)',
};

/**
 * Calcule la luminance relative WCAG d'une couleur RVB
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Hook client ultra-léger d'extraction de palette de couleurs
 * - Traite une image 5x5 pixels via un canvas invisible
 * - Spécifie systématiquement crossOrigin="anonymous"
 * - Capture silencieusement les erreurs de CORS / Canvas Tainted et bascule sur le thème par défaut
 */
export function useImagePalette(imageUrl?: string | null): ExtractedPalette {
  const [palette, setPalette] = useState<ExtractedPalette>(DEFAULT_PALETTE);

  useEffect(() => {
    if (!imageUrl) {
      setPalette(DEFAULT_PALETTE);
      return;
    }

    let isMounted = true;
    const img = new Image();
    // Sécurité CORS essentielle pour éviter le blocage canvas
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 5;
        canvas.height = 5;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setPalette(DEFAULT_PALETTE);
          return;
        }

        ctx.drawImage(img, 0, 0, 5, 5);
        const imgData = ctx.getImageData(0, 0, 5, 5).data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let count = 0;

        // Échantillonnage des pixels pour trouver la teinte dominante
        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a > 128) {
            totalR += imgData[i];
            totalG += imgData[i + 1];
            totalB += imgData[i + 2];
            count++;
          }
        }

        if (count === 0) {
          setPalette(DEFAULT_PALETTE);
          return;
        }

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);

        const luminance = getRelativeLuminance(avgR, avgG, avgB);
        const isDark = luminance < 0.45;

        // Accentuation ou assombrissement pour le fond du ticket
        const dominant = `rgb(${avgR}, ${avgG}, ${avgB})`;
        const secondary = isDark
          ? `rgb(${Math.min(255, avgR + 30)}, ${Math.min(255, avgG + 20)}, ${Math.min(255, avgB + 45)})`
          : `rgb(${Math.max(0, avgR - 35)}, ${Math.max(0, avgG - 35)}, ${Math.max(0, avgB - 35)})`;

        setPalette({
          dominant,
          secondary,
          accent: isDark ? '#8A3FFC' : '#6600FF',
          isDark,
          textColor: isDark ? '#FFFFFF' : '#0B0B14',
          subtextColor: isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(11, 11, 20, 0.72)',
          badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          badgeBorder: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
        });
      } catch {
        // En cas d'erreur CORS / Canvas Tainted sur CDN tiers, fallback silencieux garanti
        if (isMounted) {
          setPalette(DEFAULT_PALETTE);
        }
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setPalette(DEFAULT_PALETTE);
      }
    };

    img.src = imageUrl;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return palette;
}
