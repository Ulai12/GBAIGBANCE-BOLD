import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useApp } from '@/hooks/useApp';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { haptic } from '@/hooks/useHaptics';
import {
  toggleEventLike as apiToggleEventLike,
  toggleArtistFollow as apiToggleArtistFollow,
  toggleOrganizationFollow as apiToggleOrgFollow,
  subscribeToUserFavoritesLive,
} from '@/services/events';

export interface OptimisticRollbackDetail {
  type: 'favorite' | 'artist_follow' | 'org_follow' | 'user_follow' | 'ticket';
  id: string;
  message: string;
}

export interface FavoritesContextValue {
  likedEventIds: Set<string>;
  isLiked: (eventId: string) => boolean;
  toggleLike: (eventId: string) => Promise<boolean>;
  followedArtistIds: Set<string>;
  isFollowingArtist: (artistId: string) => boolean;
  toggleFollowArtist: (artistId: string) => Promise<boolean>;
  followedOrgIds: Set<string>;
  isFollowingOrg: (orgId: string) => boolean;
  toggleFollowOrg: (orgId: string) => Promise<boolean>;
  // Synchronisation unifiée des participants / amis suivis
  followedUserIds: Set<string>;
  isFollowingUser: (userId: string) => boolean;
  toggleFollowUser: (targetUserId: string) => Promise<boolean>;
}

const defaultFavoritesContextFallback: FavoritesContextValue = {
  likedEventIds: new Set<string>(),
  isLiked: () => false,
  toggleLike: async () => false,
  followedArtistIds: new Set<string>(),
  isFollowingArtist: () => false,
  toggleFollowArtist: async () => false,
  followedOrgIds: new Set<string>(),
  isFollowingOrg: () => false,
  toggleFollowOrg: async () => false,
  followedUserIds: new Set<string>(),
  isFollowingUser: () => false,
  toggleFollowUser: async () => false,
};

const FavoritesContext = createContext<FavoritesContextValue>(defaultFavoritesContextFallback);

const STORAGE_LIKES_KEY = 'gba_liked_event_ids_v1';
const STORAGE_ARTIST_FOLLOWS_KEY = 'gba_followed_artists_v1';
const STORAGE_ORG_FOLLOWS_KEY = 'gba_followed_orgs_v1';
const STORAGE_USER_FOLLOWS_KEY = 'gba_followed_users_v1';

export function getFavoritesStorageKey(type: 'likes' | 'artists' | 'orgs' | 'users', userId?: string | null): string {
  if (userId && !userId.startsWith('guest-')) {
    return `gba_user_${type}_${userId}_v1`;
  }
  return `gba_guest_${type}_v1`;
}

export function clearUserFavoritesStorage(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    // Purge legacy shared keys
    localStorage.removeItem(STORAGE_LIKES_KEY);
    localStorage.removeItem(STORAGE_ARTIST_FOLLOWS_KEY);
    localStorage.removeItem(STORAGE_ORG_FOLLOWS_KEY);
    localStorage.removeItem(STORAGE_USER_FOLLOWS_KEY);
    localStorage.removeItem('gba_fav_events_cache');
    // Purge guest keys
    localStorage.removeItem('gba_guest_likes_v1');
    localStorage.removeItem('gba_guest_artists_v1');
    localStorage.removeItem('gba_guest_orgs_v1');
    localStorage.removeItem('gba_guest_users_v1');
    // Purge user-specific keys if userId given
    if (userId) {
      localStorage.removeItem(getFavoritesStorageKey('likes', userId));
      localStorage.removeItem(getFavoritesStorageKey('artists', userId));
      localStorage.removeItem(getFavoritesStorageKey('orgs', userId));
      localStorage.removeItem(getFavoritesStorageKey('users', userId));
    }
    // Wildcard purge all favorite & follow keys to prevent any cross-session leakage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('gba_user_likes_') ||
          k.startsWith('gba_user_artists_') ||
          k.startsWith('gba_user_orgs_') ||
          k.startsWith('gba_user_users_') ||
          k.startsWith('gba_guest_likes_') ||
          k.startsWith('gba_guest_artists_') ||
          k.startsWith('gba_guest_orgs_') ||
          k.startsWith('gba_guest_users_') ||
          k.startsWith('gba_liked_') ||
          k.startsWith('gba_followed_') ||
          k.startsWith('gba_user_following_users_') ||
          k === 'gba_fav_events_cache')
      ) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore
  }
}

function readStoredSet(key: string): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // Ignore error
  }
  return new Set();
}

function writeStoredSet(key: string, set: Set<string>): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
  } catch {
    // Storage quota or private browsing
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const userId = user?.id || null;

  const [likedEventIds, setLikedEventIds] = useState<Set<string>>(() =>
    readStoredSet(getFavoritesStorageKey('likes', userId))
  );
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(() =>
    readStoredSet(getFavoritesStorageKey('artists', userId))
  );
  const [followedOrgIds, setFollowedOrgIds] = useState<Set<string>>(() =>
    readStoredSet(getFavoritesStorageKey('orgs', userId))
  );
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(() =>
    readStoredSet(getFavoritesStorageKey('users', userId))
  );

  // Clear immediately when signed out
  useEffect(() => {
    const handleSignedOut = () => {
      setLikedEventIds(new Set());
      setFollowedArtistIds(new Set());
      setFollowedOrgIds(new Set());
      setFollowedUserIds(new Set());
    };
    window.addEventListener('gba-user-signed-out', handleSignedOut);
    return () => {
      window.removeEventListener('gba-user-signed-out', handleSignedOut);
    };
  }, []);

  // Update in-memory state when switching between guest and authenticated users
  useEffect(() => {
    const likesKey = getFavoritesStorageKey('likes', userId);
    const artistsKey = getFavoritesStorageKey('artists', userId);
    const orgsKey = getFavoritesStorageKey('orgs', userId);
    const usersKey = getFavoritesStorageKey('users', userId);

    if (!userId) {
      // Guest mode - load guest state
      setLikedEventIds(readStoredSet(likesKey));
      setFollowedArtistIds(readStoredSet(artistsKey));
      setFollowedOrgIds(readStoredSet(orgsKey));
      setFollowedUserIds(readStoredSet(usersKey));
      return;
    }

    // Authenticated user - populate local user cache first
    setLikedEventIds(readStoredSet(likesKey));
    setFollowedArtistIds(readStoredSet(artistsKey));
    setFollowedOrgIds(readStoredSet(orgsKey));
    setFollowedUserIds(readStoredSet(usersKey));

    if (!isSupabaseConfigured) return;

    // Fetch user event likes from Supabase
    supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const dbLikes = new Set(data.map((r) => r.event_id as string));
          setLikedEventIds(dbLikes);
          writeStoredSet(likesKey, dbLikes);
        }
      });

    // Fetch user followed artists from Supabase
    supabase
      .from('artist_follows')
      .select('artist_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const dbArtists = new Set(data.map((r) => r.artist_id as string));
          setFollowedArtistIds(dbArtists);
          writeStoredSet(artistsKey, dbArtists);
        }
      });

    // Fetch user followed organizations from Supabase
    supabase
      .from('organization_follows')
      .select('organization_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const dbOrgs = new Set(data.map((r) => r.organization_id as string));
          setFollowedOrgIds(dbOrgs);
          writeStoredSet(orgsKey, dbOrgs);
        }
      });

    // Fetch user followed participant/friends from Supabase
    supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .then(({ data }) => {
        if (data) {
          const dbUsers = new Set(data.map((r: { following_id: string }) => r.following_id));
          setFollowedUserIds(dbUsers);
          writeStoredSet(usersKey, dbUsers);
        }
      });

    // Supabase Realtime live sync for favorites and subscriptions
    const unsubscribe = subscribeToUserFavoritesLive(userId, {
      onLikeChange: ({ eventType, eventId }) => {
        setLikedEventIds((prev) => {
          const next = new Set(prev);
          if (eventType === 'DELETE') {
            next.delete(eventId);
          } else {
            next.add(eventId);
          }
          writeStoredSet(likesKey, next);
          return next;
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-favorites-updated', { detail: { eventId, eventType } }));
        }
      },
      onArtistFollowChange: ({ eventType, artistId }) => {
        setFollowedArtistIds((prev) => {
          const next = new Set(prev);
          if (eventType === 'DELETE') {
            next.delete(artistId);
          } else {
            next.add(artistId);
          }
          writeStoredSet(artistsKey, next);
          return next;
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { artistId, eventType, type: 'artist' } }));
        }
      },
      onOrgFollowChange: ({ eventType, orgId }) => {
        setFollowedOrgIds((prev) => {
          const next = new Set(prev);
          if (eventType === 'DELETE') {
            next.delete(orgId);
          } else {
            next.add(orgId);
          }
          writeStoredSet(orgsKey, next);
          return next;
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { orgId, eventType, type: 'org' } }));
        }
      },
    });

    // Realtime listener for user_follows table
    const userFollowsChannel = supabase
      .channel(`user-follows-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as { following_id?: string };
          if (!row?.following_id) return;
          const targetId = row.following_id;
          const isDelete = payload.eventType === 'DELETE';
          setFollowedUserIds((prev) => {
            const next = new Set(prev);
            if (isDelete) next.delete(targetId);
            else next.add(targetId);
            writeStoredSet(usersKey, next);
            return next;
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gba-user-follow-changed', {
                detail: { followerId: userId, followingId: targetId, willFollow: !isDelete },
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      supabase.removeChannel(userFollowsChannel);
    };
  }, [userId]);

  // Synchronisation réactive bidirectionnelle via événements CustomEvent (ex: déclenché par un sous-composant)
  useEffect(() => {
    const handleUserFollowChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ followerId: string; followingId: string; willFollow: boolean }>;
      if (!customEvent.detail) return;
      const { followerId, followingId, willFollow } = customEvent.detail;
      if (userId && followerId === userId) {
        setFollowedUserIds((prev) => {
          const next = new Set(prev);
          if (willFollow) next.add(followingId);
          else next.delete(followingId);
          writeStoredSet(getFavoritesStorageKey('users', userId), next);
          return next;
        });
      }
    };

    window.addEventListener('gba-user-follow-changed', handleUserFollowChanged);
    return () => {
      window.removeEventListener('gba-user-follow-changed', handleUserFollowChanged);
    };
  }, [userId]);

  const isLiked = useCallback(
    (eventId: string) => likedEventIds.has(eventId),
    [likedEventIds]
  );

  const toggleLike = useCallback(
    (eventId: string): Promise<boolean> => {
      const willBeLiked = !likedEventIds.has(eventId);
      const likesKey = getFavoritesStorageKey('likes', userId);

      // 1. Feedback haptique immédiat (Taptic engine Apple)
      haptic.medium();

      // 2. Mise à jour optimiste instantanée (0ms)
      setLikedEventIds((prev) => {
        const next = new Set(prev);
        if (willBeLiked) next.add(eventId);
        else next.delete(eventId);
        writeStoredSet(likesKey, next);
        return next;
      });

      // 3. Synchronisation réseau en arrière-plan
      if (isSupabaseConfigured && userId) {
        apiToggleEventLike(eventId, userId).catch(() => {
          // Rollback transparent en cas d'échec
          setLikedEventIds((prev) => {
            const next = new Set(prev);
            if (willBeLiked) next.delete(eventId);
            else next.add(eventId);
            writeStoredSet(likesKey, next);
            return next;
          });
          haptic.error();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gba-optimistic-rollback', {
                detail: {
                  type: 'favorite',
                  id: eventId,
                  message: willBeLiked
                    ? "Échec de l'ajout aux favoris (problème réseau). Rétablissement..."
                    : "Échec du retrait des favoris (problème réseau). Rétablissement...",
                },
              })
            );
          }
        });
      }

      return Promise.resolve(willBeLiked);
    },
    [likedEventIds, userId]
  );

  const isFollowingArtist = useCallback(
    (artistId: string) => followedArtistIds.has(artistId),
    [followedArtistIds]
  );

  const toggleFollowArtist = useCallback(
    (artistId: string): Promise<boolean> => {
      const willFollow = !followedArtistIds.has(artistId);
      const artistsKey = getFavoritesStorageKey('artists', userId);

      haptic.selection();

      setFollowedArtistIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(artistId);
        else next.delete(artistId);
        writeStoredSet(artistsKey, next);
        return next;
      });

      if (isSupabaseConfigured && userId) {
        apiToggleArtistFollow(artistId, userId).catch(() => {
          setFollowedArtistIds((prev) => {
            const next = new Set(prev);
            if (willFollow) next.delete(artistId);
            else next.add(artistId);
            writeStoredSet(artistsKey, next);
            return next;
          });
          haptic.error();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gba-optimistic-rollback', {
                detail: {
                  type: 'artist_follow',
                  id: artistId,
                  message: willFollow
                    ? "Impossible de suivre cet artiste pour l'instant. Connexion instable."
                    : "Impossible de se désabonner actuellement. Connexion instable.",
                },
              })
            );
          }
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gba-follows-updated', {
            detail: { artistId, eventType: willFollow ? 'INSERT' : 'DELETE', type: 'artist' },
          })
        );
      }

      return Promise.resolve(willFollow);
    },
    [followedArtistIds, userId]
  );

  const isFollowingOrg = useCallback(
    (orgId: string) => followedOrgIds.has(orgId),
    [followedOrgIds]
  );

  const toggleFollowOrg = useCallback(
    (orgId: string): Promise<boolean> => {
      const willFollow = !followedOrgIds.has(orgId);
      const orgsKey = getFavoritesStorageKey('orgs', userId);

      haptic.selection();

      setFollowedOrgIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(orgId);
        else next.delete(orgId);
        writeStoredSet(orgsKey, next);
        return next;
      });

      if (isSupabaseConfigured && userId) {
        apiToggleOrgFollow(orgId, userId).catch(() => {
          setFollowedOrgIds((prev) => {
            const next = new Set(prev);
            if (willFollow) next.delete(orgId);
            else next.add(orgId);
            writeStoredSet(orgsKey, next);
            return next;
          });
          haptic.error();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gba-optimistic-rollback', {
                detail: {
                  type: 'org_follow',
                  id: orgId,
                  message: willFollow
                    ? "Impossible de suivre cet organisateur pour l'instant. Connexion instable."
                    : "Impossible de se désabonner actuellement. Connexion instable.",
                },
              })
            );
          }
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gba-follows-updated', {
            detail: { orgId, eventType: willFollow ? 'INSERT' : 'DELETE', type: 'org' },
          })
        );
      }

      return Promise.resolve(willFollow);
    },
    [followedOrgIds, userId]
  );

  const isFollowingUser = useCallback(
    (targetUserId: string) => followedUserIds.has(targetUserId),
    [followedUserIds]
  );

  const toggleFollowUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!userId || userId === targetUserId) return false;
      const willFollow = !followedUserIds.has(targetUserId);
      const usersKey = getFavoritesStorageKey('users', userId);

      haptic.selection();

      // Mise à jour optimiste locale immédiate
      setFollowedUserIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(targetUserId);
        else next.delete(targetUserId);
        writeStoredSet(usersKey, next);
        return next;
      });

      // Émission d'événement global pour synchroniser toutes les pages ouvertes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gba-user-follow-changed', {
            detail: { followerId: userId, followingId: targetUserId, willFollow },
          })
        );
        window.dispatchEvent(
          new CustomEvent('gba-follows-updated', {
            detail: { userId: targetUserId, eventType: willFollow ? 'INSERT' : 'DELETE', type: 'user' },
          })
        );
      }

      // Synchronisation Supabase en arrière-plan
      if (isSupabaseConfigured) {
        try {
          const { data: existing } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', userId)
            .eq('following_id', targetUserId)
            .maybeSingle();

          if (existing && !willFollow) {
            await supabase.from('user_follows').delete().eq('id', existing.id);
          } else if (!existing && willFollow) {
            await supabase.from('user_follows').insert({ follower_id: userId, following_id: targetUserId });
          }
        } catch {
          // Rollback en cas d'échec réseau
          setFollowedUserIds((prev) => {
            const next = new Set(prev);
            if (willFollow) next.delete(targetUserId);
            else next.add(targetUserId);
            writeStoredSet(usersKey, next);
            return next;
          });
          haptic.error();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('gba-optimistic-rollback', {
                detail: {
                  type: 'user_follow',
                  id: targetUserId,
                  message: willFollow
                    ? "Impossible de suivre cet utilisateur pour l'instant. Problème réseau."
                    : "Impossible de retirer cet abonnement. Problème réseau.",
                },
              })
            );
            window.dispatchEvent(
              new CustomEvent('gba-user-follow-changed', {
                detail: { followerId: userId, followingId: targetUserId, willFollow: !willFollow },
              })
            );
          }
        }
      }

      return willFollow;
    },
    [followedUserIds, userId]
  );

  return (
    <FavoritesContext.Provider
      value={{
        likedEventIds,
        isLiked,
        toggleLike,
        followedArtistIds,
        isFollowingArtist,
        toggleFollowArtist,
        followedOrgIds,
        isFollowingOrg,
        toggleFollowOrg,
        followedUserIds,
        isFollowingUser,
        toggleFollowUser,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext);
  return context || defaultFavoritesContextFallback;
}

