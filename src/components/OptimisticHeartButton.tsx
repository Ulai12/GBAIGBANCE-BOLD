import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { haptic } from '@/hooks/useHaptics';

export interface OptimisticHeartButtonProps {
  eventId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'glass' | 'floating' | 'plain';
  className?: string;
  onToggled?: (isLiked: boolean) => void;
  ariaLabel?: string;
}

export function OptimisticHeartButton({
  eventId,
  size = 'md',
  variant = 'card',
  className = '',
  onToggled,
  ariaLabel,
}: OptimisticHeartButtonProps) {
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(eventId);
  const prefersReducedMotion = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8 sm:h-9 sm:w-9',
    lg: 'h-10 w-10 sm:h-11 sm:w-11',
  }[size];

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4 sm:h-4.5 sm:w-4.5',
    lg: 'h-5 w-5',
  }[size];

  const variantClasses = {
    card: 'rounded-full border border-white/20 bg-black/35 backdrop-blur-md text-white hover:bg-white/25 active:scale-90 shadow-xs',
    glass: 'rounded-full border border-white/25 bg-black/40 backdrop-blur-xl text-white hover:bg-black/60 active:scale-90 shadow-lg',
    floating: 'rounded-full bg-white/90 dark:bg-[#1A1829]/90 border border-black/10 dark:border-white/15 text-[#1A1A2E] dark:text-white shadow-md active:scale-90',
    plain: 'rounded-full active:scale-90 text-white',
  }[variant];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    haptic.medium();
    const willBeLiked = !liked;
    if (willBeLiked) {
      setBurstKey((k) => k + 1);
    }
    toggleLike(eventId);
    onToggled?.(willBeLiked);
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Micro-burst particles on like (iOS 27 spring burst) */}
      <AnimatePresence>
        {!prefersReducedMotion && burstKey > 0 && liked && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {[0, 72, 144, 216, 288].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 16;
              const y = Math.sin(rad) * 16;
              return (
                <motion.span
                  key={`${burstKey}-${i}`}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1.2, 0],
                    x: [0, x * 1.3],
                    y: [0, y * 1.3],
                    opacity: [1, 0.8, 0],
                  }}
                  transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 shadow-xs"
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={ariaLabel || (liked ? 'Retirer des favoris' : 'Ajouter aux favoris')}
        whileTap={{ scale: 0.82 }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
        onClick={handleClick}
        className={`flex items-center justify-center transition-colors cursor-pointer select-none ${sizeClasses} ${variantClasses} ${className}`}
      >
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : liked
              ? {
                  scale: [1, 1.45, 0.88, 1.15, 1],
                  rotate: [0, -10, 8, -3, 0],
                }
              : { scale: [1, 0.9, 1] }
          }
          transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Heart
            className={`${iconSizes} transition-colors duration-200 ${
              liked
                ? 'fill-red-500 text-red-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]'
                : 'text-current'
            }`}
          />
        </motion.div>
      </motion.button>
    </div>
  );
}
