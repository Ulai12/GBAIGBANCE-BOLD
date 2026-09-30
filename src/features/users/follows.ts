import { supabase } from '@/services/supabase';
import { isRealProfile } from '@/features/events/status';
import type { Profile, PublicProfile, Artist, Organization } from '@/types';

function getLocalFollowedUserIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = `gba_user_following_users_${userId || 'guest'}_v1`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // Ignore
  }
  return new Set();
}

function saveLocalFollowedUserIds(userId: string | null | undefined, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `gba_user_following_users_${userId || 'guest'}_v1`;
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

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
  
  // 1. Sauvegarde locale persistante immédiate (garantie au rechargement)
  const localSet = getLocalFollowedUserIds(followerId);
  const willFollow = !localSet.has(followingId);
  if (willFollow) localSet.add(followingId);
  else localSet.delete(followingId);
  saveLocalFollowedUserIds(followerId, localSet);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gba-user-follow-changed', {
        detail: { followerId, followingId, willFollow },
      })
    );
  }

  // 2. Synchronisation Supabase avec gestion d'erreur transparente
  try {
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (existing) {
      await supabase.from('user_follows').delete().eq('id', existing.id);
    } else {
      await supabase.from('user_follows').insert({ follower_id: followerId, following_id: followingId });
    }
  } catch {
    // Le statut reste conservé localement
  }

  return willFollow;
}

export async function isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
  const localSet = getLocalFollowedUserIds(followerId);
  if (localSet.has(followingId)) return true;

  try {
    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (data) {
      localSet.add(followingId);
      saveLocalFollowedUserIds(followerId, localSet);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export async function fetchFollowingUsers(userId: string): Promise<Profile[]> {
  const localIds = Array.from(getLocalFollowedUserIds(userId));
  let dbIds: string[] = [];

  try {
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (data) {
      dbIds = data.map((r: { following_id: string }) => r.following_id);
    }
  } catch {
    // Fallback to local
  }

  const allIds = [...new Set([...localIds, ...dbIds])];
  if (allIds.length === 0) return [];

  // Mettre à jour le cache local avec la fusion
  saveLocalFollowedUserIds(userId, new Set(allIds));

  const profileMap = await fetchProfilesByIds(allIds);
  return (allIds.map((id: string) => profileMap.get(id)).filter(Boolean) as Profile[]).filter(isRealProfile);
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
