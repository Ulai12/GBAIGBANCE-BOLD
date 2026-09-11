import { useContext } from 'react';
import { AppContext, type AppContextValue, defaultAppContextFallback } from '@/contexts/AppContext';

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn('[useApp] AppContext is temporarily unavailable (HMR or mounting outside AppProvider). Using fallback.');
    }
    return defaultAppContextFallback;
  }
  return ctx;
}
