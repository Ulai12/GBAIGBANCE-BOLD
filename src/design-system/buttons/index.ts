/**
 * GBAIGBANCE Button Component & Presets
 * Tactile micro-haptic button states inspired by iOS
 */

export const buttonStyles = {
  primary:
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-white bg-[#6600FF] hover:bg-[#5500D6] active:scale-95 shadow-purple transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
  secondary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold text-gray-800 dark:text-white bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all duration-150 cursor-pointer',
  ghost:
    'inline-flex items-center justify-center gap-2 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer',
  chip:
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap',
} as const;
