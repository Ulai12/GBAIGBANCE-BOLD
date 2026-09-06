import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { fetchProfile } from '@/services/auth';
import type { Profile, Language } from '@/types';
import { translate } from '@/locales';

interface AppContextValue {
  user: Profile | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  language: Language;
  theme: 'light' | 'dark';
  dynamicBg: boolean;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  toggleDynamicBg: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  t: (domain: string, key: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<AppContextValue['session']>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('gba_lang') as Language) || 'fr';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gba_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [dynamicBg, setDynamicBg] = useState<boolean>(() => {
    return localStorage.getItem('gba_dynamic_bg') === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('gba_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
      } else {
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
          } catch { setUser(null); }
        })();
      } else {
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

  const toggleDynamicBg = useCallback(() => {
    setDynamicBg((prev) => {
      const next = !prev;
      localStorage.setItem('gba_dynamic_bg', String(next));
      return next;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      try {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } catch { setUser(null); }
    }
  }, [session]);

  const handleSignOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { setSession(null); }
    setUser(null);
    setSession(null);
  }, []);

  const t = useCallback((domain: string, key: string) => translate(language, domain, key), [language]);

  return (
    <AppContext.Provider value={{
      user, session, loading, language, theme, dynamicBg,
      setLanguage, toggleTheme, toggleDynamicBg, refreshProfile,
      signOut: handleSignOut, t,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
