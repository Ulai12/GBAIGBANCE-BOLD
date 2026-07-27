import { supabase } from '@/services/supabase';
import type { Profile, UserRole } from '@/types';

export async function signUp(email: string, password: string, name: string, role: UserRole = 'participant') {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
  if (error) throw error;
  if (data.user) { await supabase.from('profiles').upsert({ id: data.user.id, email, name, role }); }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select().maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
