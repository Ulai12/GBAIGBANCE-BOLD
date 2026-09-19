/**
 * GBAIGBANCE Modal & Sheet System
 */

export const modalStyles = {
  backdrop: 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity',
  dialog: 'relative w-full max-w-lg bg-white dark:bg-[#161324] rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10 z-50',
  sheet: 'fixed inset-x-0 bottom-0 max-h-[92vh] bg-white dark:bg-[#161324] rounded-t-[2rem] border-t border-black/5 dark:border-white/10 shadow-2xl z-50 overflow-y-auto',
  handle: 'w-10 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto my-3',
} as const;
