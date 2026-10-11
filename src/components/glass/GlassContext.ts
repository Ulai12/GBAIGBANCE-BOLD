/**
 * GlassContext.ts
 * ---------------
 * Contexte séparé pour la gestion d'AdaptiveGlass dans GBAIGBANCE.
 * 
 * Séparation stricte contexte / composants pour respecter les règles d'architecture
 * du projet et éviter toute coupure de React Fast Refresh.
 */

import { createContext, useContext } from 'react';

// Type statique du module liquid-glass (utilisé uniquement à la compilation TypeScript)
export type GlassLib = typeof import('@glass-sdk/liquid-glass');

export type Material = 'clear' | 'regular';
export type Appearance = 'light' | 'dark';
export type Radius = number | 'capsule' | 'circle';

export interface GlassCtx {
  /** Référence vers le module chargé dynamiquement, ou null en mode repli CSS */
  lib: GlassLib | null;
  /** Apparence claire (par défaut dans GBAIGBANCE) ou sombre */
  appearance: Appearance;
}

export const GlassContext = createContext<GlassCtx>({ lib: null, appearance: 'light' });

/** Hook consommateur du contexte de scène liquide */
export function useGlassContext(): GlassCtx {
  return useContext(GlassContext);
}
