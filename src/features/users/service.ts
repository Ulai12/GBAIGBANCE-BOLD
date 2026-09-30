import { supabase } from '@/services/supabase';
import { isRealProfile } from '@/features/events/status';
import type { Profile } from '@/types';

function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const sanitized = sanitizeSearchInput(query);
  if (!sanitized) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role, city, country, bio, created_at')
    .ilike('name', `%${sanitized}%`)
    .limit(30);
  if (error) throw error;
  const list = ((data as Profile[]) || []);
  return list.filter(isRealProfile);
}

export * from './follows';
