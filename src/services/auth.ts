import { isSupabaseConfigured, supabase } from '@/services/supabase';
import type { Profile, UserRole } from '@/types';

// Purge any legacy mock user data from localStorage immediately
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gba_mock_user');
  }
} catch {
  // Ignore
}

export async function signUp(email: string, password: string, name: string, role: UserRole = 'participant') {
  if (!isSupabaseConfigured) {
    throw new Error('La connexion au serveur Supabase n’est pas configurée.');
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
    throw new Error('La connexion au serveur Supabase n’est pas configurée.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('La connexion au serveur Supabase n’est pas configurée.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null;
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
    return null;
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
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
