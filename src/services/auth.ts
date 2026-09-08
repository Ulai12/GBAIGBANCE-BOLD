import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Profile, UserRole } from '@/types';

const MOCK_STORAGE_KEY = 'gba_mock_user';

export function getStoredMockProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createMockProfile(email: string, name: string, role: UserRole): Profile {
  const profile: Profile = {
    id: 'mock-user-id-' + Math.random().toString(36).slice(2, 9),
    name,
    email,
    phone: '+228 90 11 22 33',
    avatar_url: null,
    role,
    city: 'Lomé',
    country: 'TG',
    bio: 'Membre passionné de la communauté Gbaigbance',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export async function signUp(email: string, password: string, name: string, role: UserRole = 'participant') {
  if (!isSupabaseConfigured) {
    const profile = createMockProfile(email, name, role);
    return { data: { user: { id: profile.id, email: profile.email } as unknown as import('@supabase/supabase-js').User, session: { access_token: 'mock-token', user: { id: profile.id } } as unknown as import('@supabase/supabase-js').Session }, error: null };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });
  if (error) throw error;

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      role,
    });
  }
  return data;
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) {
    let profile = getStoredMockProfile();
    if (!profile) {
      profile = createMockProfile(email, email.split('@')[0] || 'Utilisateur', 'participant');
    }
    return { data: { user: { id: profile.id, email: profile.email } as unknown as import('@supabase/supabase-js').User, session: { access_token: 'mock-token', user: { id: profile.id } } as unknown as import('@supabase/supabase-js').Session }, error: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return getStoredMockProfile();
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    const existing = getStoredMockProfile();
    if (!existing) return null;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) {
    const p = getStoredMockProfile();
    if (!p) return null;
    return { access_token: 'mock-token', user: { id: p.id } } as unknown as import('@supabase/supabase-js').Session;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
