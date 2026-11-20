import { supabase } from '@/services/supabase';
import { isRealProfile } from '@/features/events/status';
import { getFavoritesStorageKey } from '@/contexts/FavoritesContext';
import type { Profile, PublicProfile, Artist, Organization } from '@/types';

function getLocalFollowedUserIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getFavoritesStorageKey('users', userId);
    const legacyKey = `gba_user_following_users_${userId || 'guest'}_v1`;
    const raw = localStorage.getItem(key) || localStorage.getItem(legacyKey);
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
    const key = getFavoritesStorageKey('users', userId);
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

  const localSet = getLocalFollowedUserIds(followerId);
  const optimisticFollow = !localSet.has(followingId);
  if (optimisticFollow) localSet.add(followingId);
  else localSet.delete(followingId);
  saveLocalFollowedUserIds(followerId, localSet);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gba-user-follow-changed', {
        detail: { followerId, followingId, willFollow: optimisticFollow },
      })
    );
    window.dispatchEvent(
      new CustomEvent('gba-follows-updated', {
        detail: {
          userId: followingId,
          eventType: optimisticFollow ? 'INSERT' : 'DELETE',
          type: 'user',
        },
      })
    );
  }

  try {
    const { data, error } = await supabase.rpc('toggle_user_follow', {
      p_following_id: followingId,
    });
    if (error) throw new Error(error.message);
    const rec = data as { success?: boolean; following?: boolean; error?: string } | null;
    if (!rec?.success) {
      throw new Error(rec?.error || 'Impossible de mettre a jour le suivi');
    }
    const willFollow = rec.following === true;
    // Align local cache with server truth
    const synced = getLocalFollowedUserIds(followerId);
    if (willFollow) synced.add(followingId);
    else synced.delete(followingId);
    saveLocalFollowedUserIds(followerId, synced);
    return willFollow;
  } catch (err) {
    // Rollback local optimistic state
    const rollback = getLocalFollowedUserIds(followerId);
    if (optimisticFollow) rollback.delete(followingId);
    else rollback.add(followingId);
    saveLocalFollowedUserIds(followerId, rollback);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gba-user-follow-changed', {
          detail: { followerId, followingId, willFollow: !optimisticFollow },
        })
      );
    }
    throw err;
  }
}

export async function setUserFollow(
  followerId: string,
  followingId: string,
  shouldFollow: boolean,
): Promise<boolean> {
  if (!followerId || !followingId || followerId === followingId) {
    throw new Error('Identifiant de suivi invalide.');
  }

  if (shouldFollow) {
    const { error } = await supabase
      .from('user_follows')
      .upsert(
        { follower_id: followerId, following_id: followingId },
        { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw new Error(error.message);
  }

  return shouldFollow;
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
  let dbIds: string[] | null = null;

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

  const targetIds = dbIds !== null ? dbIds : Array.from(getLocalFollowedUserIds(userId));
  if (targetIds.length === 0) {
    if (dbIds !== null) {
      saveLocalFollowedUserIds(userId, new Set());
    }
    return [];
  }

  saveLocalFollowedUserIds(userId, new Set(targetIds));

  const profileMap = await fetchProfilesByIds(targetIds);
  return (targetIds.map((id: string) => profileMap.get(id)).filter(Boolean) as Profile[]).filter(isRealProfile);
}

export async function fetchFollowersUsers(userId: string): Promise<Profile[]> {
  let dbIds: string[] = [];
  try {
    const { data } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);
    if (data) {
      dbIds = data.map((r: { follower_id: string }) => r.follower_id);
    }
  } catch {
    // Ignore
  }

  const unique = [...new Set(dbIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const profileMap = await fetchProfilesByIds(unique);
  return (unique.map((id: string) => profileMap.get(id)).filter(Boolean) as Profile[]).filter(isRealProfile);
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
