/**
 * GlassButton.tsx
 * ---------------
 * Bouton d'action adaptatif GBAIGBANCE propulsé par Liquid Glass.
 *
 * Fonctionnalités :
 * - Intégration de <GlassPanel> pour les variantes en verre avec réfraction GPU
 *   (WebGPU) et repli CSS Apple (backdrop-filter saturé) sur les autres appareils.
 * - Réactivité au toucher (interactive) avec rebond élastique subtil.
 * - Respect des cibles tactiles iOS (hauteur minimale >= 44 px).
 * - Prise en charge des variantes primary (teinte violette GBAIGBANCE), secondary, ghost, danger.
 */

import type { ReactNode } from 'react';
import { GlassPanel } from '@/components/glass';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: GlassButtonProps) {
  // Dimensions ergonomiques respectant la zone tactile Apple (>= 44px)
  const sizes = {
    sm: 'px-4 py-2 text-xs min-h-[44px]',
    md: 'px-6 py-3 text-sm sm:text-base min-h-[44px]',
    lg: 'px-8 py-4 text-base sm:text-lg min-h-[48px]',
  };

  // 1. Variante Verre Secondaire (matériau Liquid Glass translucide)
  if (variant === 'secondary') {
    return (
      <GlassPanel
        radius={16}
        interactive={!disabled}
        className={`inline-block ${fullWidth ? 'w-full' : ''}`}
      >
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full ${sizes[size]}
            font-bold text-[#1A1A2E] dark:text-white
            flex items-center justify-center gap-2
            transition-transform duration-200
            hover:scale-[1.01] active:scale-[0.98]
            disabled:opacity-50 disabled:pointer-events-none cursor-pointer
            ${className}
          `}
        >
          {children}
        </button>
      </GlassPanel>
    );
  }

  // 2. Variante Verre Primaire (matériau Liquid Glass teinté dans le violet signature #6600FF)
  if (variant === 'primary') {
    return (
      <GlassPanel
        radius={16}
        interactive={!disabled}
        tint="#6600FF"
        className={`inline-block shadow-lg shadow-[#6600FF]/25 ${fullWidth ? 'w-full' : ''}`}
      >
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full ${sizes[size]}
            font-extrabold text-white
            flex items-center justify-center gap-2
            transition-transform duration-200
            hover:scale-[1.01] active:scale-[0.98]
            disabled:opacity-50 disabled:pointer-events-none cursor-pointer
            ${className}
          `}
        >
          {children}
        </button>
      </GlassPanel>
    );
  }

  // 3. Autres variantes (Ghost et Danger)
  const standardVariants = {
    ghost: 'text-[#4d4d5d] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizes[size]} ${standardVariants[variant]} ${fullWidth ? 'w-full' : ''}
        rounded-2xl font-bold transition-all duration-200
        flex items-center justify-center gap-2
        hover:scale-[1.01] active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none cursor-pointer
        ${className}
      `}
    >
      {children}
    </button>
  );
}
