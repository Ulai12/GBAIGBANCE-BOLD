import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://qbngqstyhusndngkours.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFibmdxc3R5aHVzbmRuZ2tvdXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDk2MjEsImV4cCI6MjEwMDUyNTYyMX0.FjxlwhFLJe9rgio0FmP48ae8maMNuWwn3yZv2g_p8dM';

function getJwtProjectRef(token?: string): string | null {
  if (!token || !token.includes('.')) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(base64)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf8')
        : null;
    if (!json) return null;
    const parsed = JSON.parse(json);
    return parsed.ref || null;
  } catch {
    return null;
  }
}

function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  const rawUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const rawKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  const url = (rawUrl || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const keyRef = getJwtProjectRef(rawKey);

  // If the target project is qbngqstyhusndngkours and the key belongs to a different project ref, use the valid matching key
  if (url.includes('qbngqstyhusndngkours') && keyRef !== 'qbngqstyhusndngkours') {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
    };
  }

  return {
    url,
    anonKey: rawKey || DEFAULT_SUPABASE_ANON_KEY,
  };
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseCredentials();

export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);
