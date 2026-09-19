/**
 * GBAIGBANCE - Unified iOS Taptic Engine Simulator
 * 
 * Provides tactile feedback for mobile and web touch interactions using
 * the W3C Vibration API with iOS-tuned vibration patterns.
 */

export type HapticType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  // Micro-click for tab navigation, toggle switches, option pickers
  selection: 10,
  // Subtle touch for buttons, modal dismiss, card tap
  light: 15,
  // Distinct feedback for favorites, bookmarks, reservations
  medium: 25,
  // Prominent tap for deletions, destructive actions
  heavy: 45,
  // iOS Apple Pay / FaceID double-pulse validation
  success: [12, 35, 18],
  // Dual alert warning
  warning: [25, 40, 25],
  // Tri-pulse error indication
  error: [40, 45, 40, 45, 55],
};

/**
 * Executes a haptic vibration pattern safely across web browsers.
 */
export function triggerHaptic(type: HapticType = 'light'): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      const pattern = HAPTIC_PATTERNS[type];
      return navigator.vibrate(pattern);
    }
  } catch {
    // Silently handle any browser security restrictions
  }

  return false;
}

export const haptic = {
  trigger: triggerHaptic,
  selection: () => triggerHaptic('selection'),
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};

/**
 * React Hook to access unified iOS Haptics.
 */
export function useHaptics() {
  return haptic;
}
