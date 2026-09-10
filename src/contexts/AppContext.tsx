import { useState, useEffect, useCallback, createContext, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { fetchProfile, signOut as authSignOut } from '@/services/auth';
import { syncGeminiConfigFromAccount } from '@/services/gemini';
import { saveCachedProfile } from '@/services/cache';
import type { Profile, Language } from '@/types';
import { translate } from '@/locales';

export interface AppContextValue {
  user: Profile | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  language: Language;
  theme: 'light' | 'dark';
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  t: (domain: string, key: string) => string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('gba_profile');
      if (cached) return JSON.parse(cached) as Profile;
    } catch {
      // Ignore parse error
    }
    return null;
  });
  const [session, setSession] = useState<AppContextValue['session']>(null);
  const [loading, setLoading] = useState(() => {
    try {
      // If we have a cached user profile, do not block the app on splash screen
      return !localStorage.getItem('gba_profile');
    } catch {
      return true;
    }
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('gba_lang') as Language) || 'fr';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gba_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id)
          .then((profile) => {
            setUser(profile);
            saveCachedProfile(profile).catch(() => {});
            syncGeminiConfigFromAccount(session.user.user_metadata, profile?.gemini_config);
          })
          .catch(() => {
            // Keep cached profile if offline
          })
          .finally(() => setLoading(false));
      } else {
        saveCachedProfile(null).catch(() => {});
        setUser(null);
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        (async () => {
          try {
            const profile = await fetchProfile(session.user.id);
            setUser(profile);
            saveCachedProfile(profile).catch(() => {});
            syncGeminiConfigFromAccount(session.user.user_metadata, profile?.gemini_config);
          } catch {
            // keep existing state
          }
        })();
      } else {
        saveCachedProfile(null).catch(() => {});
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
    try { await authSignOut(); } catch { setSession(null); }
    saveCachedProfile(null).catch(() => {});
    setUser(null);
    setSession(null);
  }, []);

  const t = useCallback((domain: string, key: string) => translate(language, domain, key), [language]);

  return (
    <AppContext.Provider value={{
      user, session, loading, language, theme,
      setLanguage, toggleTheme, refreshProfile,
      signOut: handleSignOut, t,
    }}>
      {children}
    </AppContext.Provider>
  );
}
