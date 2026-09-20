import { useState, useEffect, useCallback, useRef, createContext, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { fetchProfile, signOut as authSignOut } from '@/services/auth';
import { syncGeminiConfigFromAccount, clearGeminiLocalConfig } from '@/services/gemini';
import { saveCachedProfile, clearCachedUserTickets, clearAllPrivateUserData } from '@/services/cache';
import { getLocalProfile, clearLocalProfile } from '@/hooks/useLocalProfile';
import { clearUserFavoritesStorage } from '@/contexts/FavoritesContext';
import { clearLocalUserTickets } from '@/services/events';
import { clearCachedTicketsMemory } from '@/screens/TicketsScreen';
import { clearCachedSubscriptions } from '@/screens/SubscriptionsScreen';
import type { Profile, Language } from '@/types';
import { translate } from '@/locales';

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
  setLanguage: (lang: Language) => void;
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
  setLanguage: () => {},
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gba_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  const activeUserIdRef = useRef<string | null>(getLocalProfile()?.id || null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('gba_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const loadProfileForUser = async (userObj: { id: string; user_metadata?: Record<string, unknown> }, isSilent = false) => {
      if (activeUserIdRef.current === userObj.id && isSilent) {
        return;
      }
      activeUserIdRef.current = userObj.id;

      try {
        const profile = await fetchProfile(userObj.id);
        setUser(profile);
        saveCachedProfile(profile).catch(() => {});
        syncGeminiConfigFromAccount(userObj.user_metadata, profile?.gemini_config);
      } catch {
        // Keep cached profile if offline
      } finally {
        setLoading(false);
        setIsSessionResolving(false);
      }
    };

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        loadProfileForUser(initialSession.user);
      } else {
        const prevId = activeUserIdRef.current;
        activeUserIdRef.current = null;
        performSignOutCleanup(prevId);
        setUser(null);
        setLoading(false);
        setIsSessionResolving(false);
      }
    }).catch(() => {
      setLoading(false);
      setIsSessionResolving(false);
    });

    // 2. Event listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        // If already resolved during initial getSession, avoid redundant network cascade
        loadProfileForUser(currentSession.user, true);
      } else {
        const prevUserId = activeUserIdRef.current;
        activeUserIdRef.current = null;
        performSignOutCleanup(prevUserId);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gba_lang', lang);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    if (session?.user) {
      try {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
        saveCachedProfile(profile).catch(() => {});
        syncGeminiConfigFromAccount(session.user.user_metadata, profile?.gemini_config);
      } catch {
        // Keep cached
      }
    }
  }, [session]);

  const handleSignOut = useCallback(async () => {
    const currentUserId = user?.id || activeUserIdRef.current;
    // 1. Immediate sync purge of memory and storage (0ms UI reset)
    performSignOutCleanup(currentUserId);
    activeUserIdRef.current = null;
    setUser(null);
    setSession(null);

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
      user, session, loading, isSessionResolving, language, theme,
      setLanguage, toggleTheme, refreshProfile,
      signOut: handleSignOut, t,
    }}>
      {children}
    </AppContext.Provider>
  );
}
