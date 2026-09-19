import { supabase } from '@/services/supabase';
import type { Profile, PublicProfile, Artist, Organization } from '@/types';

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role')
    .in('id', unique);
  (data || []).forEach((p) => map.set(p.id, p as PublicProfile));
  return map;
}

export async function toggleUserFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const { data: existing } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existing) {
    await supabase.from('user_follows').delete().eq('id', existing.id);
    return false;
  }
  await supabase.from('user_follows').insert({ follower_id: followerId, following_id: followingId });
  return true;
}

export async function isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

export async function fetchFollowingUsers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const profileMap = await fetchProfilesByIds(ids);
  return ids.map((id: string) => profileMap.get(id)).filter(Boolean) as Profile[];
}

export async function fetchUserFollowersCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count || 0;
}

export async function fetchUserFollowingCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count || 0;
}

export async function fetchFollowedArtists(userId: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artist_follows')
    .select('artist_id')
    .eq('user_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { artist_id: string }) => r.artist_id);
  if (ids.length === 0) return [];
  const { data: artists } = await supabase.from('artists').select('*').in('id', ids);
  return (artists as Artist[]) || [];
}

export async function fetchFollowedOrganizations(userId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organization_follows')
    .select('organization_id')
    .eq('user_id', userId);
  if (error) return [];
  const ids = (data || []).map((r: { organization_id: string }) => r.organization_id);
  if (ids.length === 0) return [];
  const { data: orgs } = await supabase.from('organizations').select('*').in('id', ids);
  return (orgs as Organization[]) || [];
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
