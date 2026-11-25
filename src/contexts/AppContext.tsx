import { useState, useEffect, useCallback, useRef, createContext, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { fetchProfile, signOut as authSignOut } from '@/services/auth';
import { syncGeminiConfigFromAccount, clearGeminiLocalConfig } from '@/services/gemini';
import {
  saveCachedProfile,
  clearCachedUserTickets,
  clearAllPrivateUserData,
  clearCachedTicketsMemory,
  clearCachedSubscriptions,
} from '@/services/cache';
import { getLocalProfile, clearLocalProfile } from '@/hooks/useLocalProfile';
import { clearUserFavoritesStorage } from '@/contexts/FavoritesContext';
import { clearLocalUserTickets } from '@/services/events';
import type { Profile, Language } from '@/types';
import { applyDocumentTheme, getSavedThemeMode, getSystemTheme, type ThemeMode } from '@/app-shell/Theme';
import { translate } from '@/locales';
import {
  type UserLocationState,
  LOME_CENTER,
  getCurrentUserLocation,
  requestUserLocation,
} from '@/utils/geo';

export function performSignOutCleanup(userId?: string | null): void {
  try {
    if (userId) {
      clearCachedUserTickets(userId).catch(() => {});
      clearLocalUserTickets(userId);
    } else {
      clearCachedUserTickets().catch(() => {});
      clearLocalUserTickets();
    }
    clearAllPrivateUserData(userId || undefined).catch(() => {});
    clearCachedTicketsMemory();
    clearCachedSubscriptions();
    clearUserFavoritesStorage(userId);
    clearLocalProfile();
    saveCachedProfile(null).catch(() => {});
    clearGeminiLocalConfig();

    if (typeof window !== 'undefined') {
      // 1. Specifically purge targeted user keys if userId provided
      if (userId) {
        localStorage.removeItem(`gba_my_events_${userId}`);
        localStorage.removeItem(`gba_tickets_digest_${userId}`);
        localStorage.removeItem(`gba_user_tickets_${userId}`);
      }

      // 2. Comprehensive wildcard purge of all user/session data in localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith('gba_user_') ||
          k.startsWith('gba_guest_') ||
          k.startsWith('gba_liked_') ||
          k.startsWith('gba_followed_') ||
          k.startsWith('gba_my_events_') ||
          k.startsWith('gba_tickets_') ||
          k === 'gba_fav_events_cache' ||
          k === 'gba_profile' ||
          k === 'gba_user_tickets' ||
          k === 'gba_user_tickets_guest' ||
          k === 'gba_guest_id'
        ) {
          localStorage.removeItem(k);
        }
      }

      // Dispatch global events so all components clear state immediately
      window.dispatchEvent(new CustomEvent('gba-user-signed-out'));
      window.dispatchEvent(new CustomEvent('gba-favorites-updated', { detail: { eventType: 'RESET' } }));
      window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { eventType: 'RESET' } }));
      window.dispatchEvent(new CustomEvent('gba-tickets-count-changed', { detail: { count: 0 } }));
    }
  } catch {
    // Ignore cleanup error
  }
}

export interface AppContextValue {
  user: Profile | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  isSessionResolving: boolean;
  language: Language;
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  userLocation: UserLocationState;
  requestGPS: () => Promise<UserLocationState>;
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  t: (domain: string, key: string) => string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const defaultAppContextFallback: AppContextValue = {
  user: null,
  session: null,
  loading: true,
  isSessionResolving: false,
  language: 'fr',
  theme: 'light',
  themeMode: 'system',
  userLocation: {
    latitude: LOME_CENTER.latitude,
    longitude: LOME_CENTER.longitude,
    isActual: false,
    status: 'idle',
    cityName: 'Lomé',
  },
  requestGPS: async () => ({
    latitude: LOME_CENTER.latitude,
    longitude: LOME_CENTER.longitude,
    isActual: false,
    status: 'idle',
    cityName: 'Lomé',
  }),
  setLanguage: () => {},
  setThemeMode: () => {},
  toggleTheme: () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
  t: (domain: string, key: string) => translate('fr', domain, key),
};

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue>(defaultAppContextFallback);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    const local = getLocalProfile();
    if (local) {
      return {
        id: local.id,
        name: local.name,
        email: null,
        phone: null,
        avatar_url: local.avatar_url,
        role: local.role,
        city: local.city || 'Lomé',
        country: local.country || 'Togo',
        bio: null,
        gemini_config: null,
        created_at: '',
        updated_at: '',
      } as Profile;
    }
    return null;
  });
  const [session, setSession] = useState<AppContextValue['session']>(null);
  const [isSessionResolving, setIsSessionResolving] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(() => {
    // If we have a cached minimal profile snapshot, do not block the app on splash screen
    return !getLocalProfile();
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('gba_lang') as Language) || 'fr';
  });
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getSavedThemeMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);
  const theme = themeMode === 'system' ? systemTheme : themeMode;

  const [userLocation, setUserLocation] = useState<UserLocationState>({
    latitude: LOME_CENTER.latitude,
    longitude: LOME_CENTER.longitude,
    isActual: false,
    status: 'idle',
    cityName: 'Lomé',
  });

  useEffect(() => {
    getCurrentUserLocation().then((loc) => {
      setUserLocation(loc);
    });
  }, []);

  const requestGPS = useCallback(async () => {
    const loc = await requestUserLocation();
    setUserLocation(loc);
    return loc;
  }, []);

  const activeUserIdRef = useRef<string | null>(getLocalProfile()?.id || null);
  const profileRequestIdRef = useRef(0);
  const profileLoadInFlightRef = useRef<{ userId: string; requestId: number } | null>(null);

  useEffect(() => {
    applyDocumentTheme(theme, themeMode);
  }, [theme, themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncSystemTheme);
      return () => media.removeEventListener('change', syncSystemTheme);
    }
    media.addListener(syncSystemTheme);
    return () => media.removeListener(syncSystemTheme);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const loadProfileForUser = async (userObj: { id: string; user_metadata?: Record<string, unknown> }, isSilent = false) => {
      const requestUserId = userObj.id;
      if (activeUserIdRef.current === requestUserId && isSilent) {
        return;
      }
      if (profileLoadInFlightRef.current?.userId === requestUserId) {
        return;
      }

      // Un ancien profil ne doit jamais conserver ses droits pendant le changement de compte.
      if (activeUserIdRef.current !== requestUserId) {
        setIsSessionResolving(true);
        setUser(null);
      }
      activeUserIdRef.current = requestUserId;

      const requestId = ++profileRequestIdRef.current;
      profileLoadInFlightRef.current = { userId: requestUserId, requestId };

      try {
        const profile = await fetchProfile(requestUserId);
        if (activeUserIdRef.current !== requestUserId || profileRequestIdRef.current !== requestId) {
          return;
        }
        setUser(profile);
        saveCachedProfile(profile).catch(() => {});
        syncGeminiConfigFromAccount(userObj.user_metadata, profile?.gemini_config);
      } catch {
        // Conserve uniquement le cache déjà associé à ce même compte en cas de panne réseau.
      } finally {
        if (profileLoadInFlightRef.current?.requestId === requestId) {
          profileLoadInFlightRef.current = null;
        }
        // Une réponse tardive d'un ancien compte ne doit pas terminer le chargement du compte courant.
        if (activeUserIdRef.current === requestUserId && profileRequestIdRef.current === requestId) {
          setLoading(false);
          setIsSessionResolving(false);
        }
      }
    };

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        loadProfileForUser(initialSession.user);
      } else {
        const prevId = activeUserIdRef.current;
        profileRequestIdRef.current += 1;
        profileLoadInFlightRef.current = null;
        activeUserIdRef.current = null;
        if (prevId) {
          performSignOutCleanup(prevId);
        }
        setUser(null);
        setLoading(false);
        setIsSessionResolving(false);
      }
    }).catch(() => {
      setLoading(false);
      setIsSessionResolving(false);
    });

    // 2. Event listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        // If already resolved during initial getSession, avoid redundant network cascade
        loadProfileForUser(currentSession.user, true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-user-signed-in', { detail: { userId: currentSession.user.id } }));
        }
      } else {
        const prevUserId = activeUserIdRef.current;
        profileRequestIdRef.current += 1;
        profileLoadInFlightRef.current = null;
        activeUserIdRef.current = null;
        if (prevUserId) {
          performSignOutCleanup(prevUserId);
        }
        setUser(null);
        setIsSessionResolving(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gba_lang', lang);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('gba_theme', mode);
    } catch {
      // Le thème reste utilisable même si le stockage local est indisponible.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === 'light' ? 'dark' : 'light');
  }, [setThemeMode, theme]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    const requestedUserId = session?.user.id;
    if (!requestedUserId || activeUserIdRef.current !== requestedUserId) {
      return;
    }
    try {
      const profile = await fetchProfile(requestedUserId);
      if (activeUserIdRef.current !== requestedUserId) {
        return;
      }
      setUser(profile);
      saveCachedProfile(profile).catch(() => {});
      syncGeminiConfigFromAccount(session.user.user_metadata, profile?.gemini_config);
    } catch {
      // Keep cached only for the same account.
    }
  }, [session]);

  const handleSignOut = useCallback(async () => {
    const currentUserId = user?.id || activeUserIdRef.current;
    // Invalide toute lecture de profil encore en vol avant de purger le compte.
    profileRequestIdRef.current += 1;
    profileLoadInFlightRef.current = null;
    activeUserIdRef.current = null;
    // 1. Immediate sync purge of memory and storage (0ms UI reset)
    performSignOutCleanup(currentUserId);
    setUser(null);
    setSession(null);
    setIsSessionResolving(false);

    // 2. Perform backend Supabase sign out
    try {
      await authSignOut();
    } catch {
      // Continue cleanup
    }

    // 3. Re-verify storage purge
    performSignOutCleanup(currentUserId);
  }, [user?.id]);

  const t = useCallback((domain: string, key: string) => translate(language, domain, key), [language]);

  return (
    <AppContext.Provider value={{
      user, session, loading, isSessionResolving, language, theme, themeMode,
      userLocation, requestGPS,
      setLanguage, setThemeMode, toggleTheme, refreshProfile,
      signOut: handleSignOut, t,
    }}>
      {children}
    </AppContext.Provider>
  );
}
