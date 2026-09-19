/**
 * GBAIGBANCE Typography System
 * High-contrast, mathematically scaled typography definitions
 */

export const typography = {
  h1: 'text-2xl sm:text-3xl font-black tracking-[-0.035em] leading-tight',
  h2: 'text-xl sm:text-2xl font-black tracking-[-0.03em] leading-snug',
  h3: 'text-lg sm:text-xl font-extrabold tracking-[-0.02em]',
  body: 'text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300',
  caption: 'text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400',
  eyebrow: 'text-[10px] font-black uppercase tracking-[0.14em] text-[#6600FF] dark:text-purple-400',
  label: 'text-xs font-bold whitespace-nowrap',
} as const;
