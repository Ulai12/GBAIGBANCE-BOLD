/**
 * AdaptiveGlass.tsx
 * ------------------
 * Enveloppe adaptative autour de @glass-sdk/liquid-glass (v0.0.x) avec repli CSS natif.
 *
 * Fonctionnement technique :
 *  1. Vérification stricte de l'adaptateur matériel WebGPU (navigator.gpu.requestAdapter()).
 *  2. Si WebGPU est validé : chargement asynchrone (import dynamique) du module et du CSS.
 *  3. Si WebGPU est absent ou en cas d'échec réseau : repli fluide en CSS pur
 *     (backdrop-filter / glassmorphism haute fidélité Apple HIG).
 *  4. Zéro impact sur le bundle initial pour les terminaux sans WebGPU.
 */

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import * as Sentry from '@sentry/react';
import {
  GlassContext,
  useGlassContext,
  type GlassLib,
  type Material,
  type Appearance,
  type Radius,
} from './GlassContext';

// ---------------------------------------------------------------------------
// 1. Détection matérielle WebGPU & Chargement dynamique
// ---------------------------------------------------------------------------

/**
 * Vérifie rigoureusement si un adaptateur physique WebGPU est opérationnel.
 * Un simple `navigator.gpu` ne suffit pas car `requestAdapter()` peut renvoyer `null`
 * sur les machines virtuelles, navigateurs restreints ou puces graphiques non supportées.
 */
export async function hasWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  const navWithGpu = navigator as unknown as {
    gpu?: { requestAdapter: (options?: unknown) => Promise<unknown | null> };
  };

  if (!navWithGpu.gpu || typeof navWithGpu.gpu.requestAdapter !== 'function') {
    return false;
  }

  try {
    const adapter = await navWithGpu.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    // Évite tout blocage en cas d'exception levée par les restrictions navigateur
    return false;
  }
}

/**
 * Hook de détection et d'import dynamique de la bibliothèque liquid-glass.
 * - undefined : détection en cours (évite un saut visuel ou flash)
 * - null : mode repli CSS activé (pas de WebGPU ou erreur de chargement)
 * - module : bibliothèque chargée et prête pour le rendu GPU
 */
export function useGlassLib(): GlassLib | null | undefined {
  const [lib, setLib] = useState<GlassLib | null | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const isGpuSupported = await hasWebGPU();

      if (!isGpuSupported) {
        if (!isCancelled) setLib(null);
        return;
      }

      try {
        // Import dynamique conditionnel : le code et le CSS ne sont téléchargés que si WebGPU est validé
        const [importedLib] = await Promise.all([
          import('@glass-sdk/liquid-glass'),
          import('@glass-sdk/liquid-glass/styles.css'),
        ]);

        if (!isCancelled) {
          setLib(importedLib);
        }
      } catch (err) {
        // En cas d'échec réseau ou d'incompatibilité au runtime, capture d'un avertissement télémétrique
        try {
          Sentry.captureMessage(
            'Échec du chargement dynamique de @glass-sdk/liquid-glass, bascule sur le repli CSS.',
            'warning'
          );
        } catch {
          // Tolérance si Sentry n'est pas actif à cet instant
        }

        if (!isCancelled) {
          setLib(null);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return lib;
}

// ---------------------------------------------------------------------------
// 2. GlassBackdrop : Enveloppe de Scène
// ---------------------------------------------------------------------------

export interface GlassBackdropProps {
  /** Contenu situé en arrière-plan destiné à être réfracté optiquement */
  background: ReactNode;
  /** Surfaces en verre (GlassPanel) superposées */
  children: ReactNode;
  material?: Material;
  /** Apparence du verre : clair (défaut GBAIGBANCE) ou sombre */
  appearance?: Appearance;
  style?: CSSProperties;
  className?: string;
}

/**
 * Scène adaptative :
 * - En mode WebGPU : encapsule <GlassScene> et <GlassContent> avec un calque overlay pointer-events: none.
 * - En mode Repli CSS : affiche le background avec le calque overlay superposé.
 * - Pendant la détection : rend uniquement le fond pour éviter tout clignotement.
 */
export function GlassBackdrop({
  background,
  children,
  material = 'regular',
  appearance = 'light',
  style,
  className,
}: GlassBackdropProps) {
  const lib = useGlassLib();

  // Calque transparent hébergeant les panneaux en verre
  // pointerEvents: "none" pour laisser passer les clics vers le fond si nécessaire ;
  // chaque GlassPanel réactive pointerEvents: "auto" pour son propre contenu interactif.
  const overlayLayer = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {children}
    </div>
  );

  // Phase d'évaluation : rendu du fond seul pour éviter les flashs visuels
  if (lib === undefined) {
    return (
      <div className={className} style={{ position: 'relative', ...style }}>
        {background}
      </div>
    );
  }

  // Repli CSS natif (Glassmorphism haute fidélité)
  if (lib === null) {
    return (
      <GlassContext.Provider value={{ lib: null, appearance }}>
        <div className={className} style={{ position: 'relative', ...style }}>
          {background}
          {overlayLayer}
        </div>
      </GlassContext.Provider>
    );
  }

  // Verre Liquide Réel GPU
  const { GlassScene, GlassContent } = lib;
  return (
    <GlassContext.Provider value={{ lib, appearance }}>
      <GlassScene
        material={material}
        appearance={appearance}
        className={className}
        style={style}
      >
        <GlassContent>{background}</GlassContent>
        {overlayLayer}
      </GlassScene>
    </GlassContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// 3. GlassPanel : Surface en verre adaptative
// ---------------------------------------------------------------------------

export interface GlassPanelProps {
  children?: ReactNode;
  radius?: Radius;
  interactive?: boolean;
  tint?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Convertit une couleur hexadécimale (#RRGGBB) en notation RGBA avec opacité spécifiée
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Traduit les types de rayon de la lib liquid-glass en valeurs CSS standard
 */
function translateRadiusToCss(radius: Radius): string | number {
  if (radius === 'capsule') return 9999;
  if (radius === 'circle') return '50%';
  return radius;
}

/**
 * Surface en verre :
 * - Mode WebGPU : rend <GlassSurface> de @glass-sdk/liquid-glass avec réfraction GPU réelle.
 * - Mode Repli CSS : div stylisé respectant les Apple HIG, backdrop-filter avec saturation,
 *   ombres douces et prise en compte de la transparence réduite.
 */
export function GlassPanel({
  children,
  radius = 24,
  interactive = false,
  tint,
  style,
  className,
}: GlassPanelProps) {
  const { lib, appearance } = useGlassContext();

  // Mode WebGPU réel
  if (lib) {
    const { GlassSurface } = lib;
    return (
      <GlassSurface
        radius={radius}
        interactive={interactive}
        tint={tint}
        className={className}
        style={{
          pointerEvents: 'auto',
          ...style,
        }}
      >
        {children}
      </GlassSurface>
    );
  }

  // Mode repli CSS Apple HIG
  const isDark = appearance === 'dark';
  const defaultBg = isDark ? 'rgba(20, 20, 28, 0.45)' : 'rgba(255, 255, 255, 0.55)';
  const appliedBg = tint ? hexToRgba(tint, 0.32) : defaultBg;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.65)';

  return (
    <div
      className={className}
      style={{
        pointerEvents: 'auto',
        borderRadius: translateRadiusToCss(radius),
        backgroundColor: appliedBg,
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        border: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
          : '0 8px 30px rgba(102, 0, 255, 0.10), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
