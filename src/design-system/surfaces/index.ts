/**
 * GBAIGBANCE Surface & Container Styles
 * iOS 27 inspired frosted glass, micro-borders, and elevated canvas sheets
 */

export const surfaces = {
  glass: 'bg-white/85 dark:bg-[#171424]/85 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xs',
  sheet: 'bg-white dark:bg-[#14121E] border-t border-black/5 dark:border-white/10 shadow-2xl',
  card: 'bg-white dark:bg-[#1A1628] border border-black/5 dark:border-white/8 rounded-2xl shadow-xs transition-all',
  overlay: 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50',
} as const;
