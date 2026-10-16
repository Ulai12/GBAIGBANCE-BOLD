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

  // Fonction de re-synchronisation complète et robuste depuis Supabase
  const refreshAllFavoritesFromSupabase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    const likesKey = getFavoritesStorageKey('likes', userId);
    const artistsKey = getFavoritesStorageKey('artists', userId);
    const orgsKey = getFavoritesStorageKey('orgs', userId);
    const usersKey = getFavoritesStorageKey('users', userId);

    try {
      const [likesRes, artRes, orgRes, usersRes] = await Promise.all([
        supabase.from('event_likes').select('event_id').eq('user_id', userId),
        supabase.from('artist_follows').select('artist_id').eq('user_id', userId),
        supabase.from('organization_follows').select('organization_id').eq('user_id', userId),
        supabase.from('user_follows').select('following_id').eq('follower_id', userId),
      ]);

      if (likesRes.data) {
        const dbLikes = new Set(likesRes.data.map((r) => r.event_id as string));
        setLikedEventIds(dbLikes);
        writeStoredSet(likesKey, dbLikes);
      }
      if (artRes.data) {
        const dbArtists = new Set(artRes.data.map((r) => r.artist_id as string));
        setFollowedArtistIds(dbArtists);
        writeStoredSet(artistsKey, dbArtists);
      }
      if (orgRes.data) {
        const dbOrgs = new Set(orgRes.data.map((r) => r.organization_id as string));
        setFollowedOrgIds(dbOrgs);
        writeStoredSet(orgsKey, dbOrgs);
      }
      if (usersRes.data) {
        const dbUsers = new Set(usersRes.data.map((r: { following_id: string }) => r.following_id));
        setFollowedUserIds(dbUsers);
        writeStoredSet(usersKey, dbUsers);
      }
    } catch {
      // Conserver le cache local
    }
  }, [userId]);

  // Synchronisation inter-onglets via BroadcastChannel et Storage events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('gba_favorites_channel');
        bc.onmessage = (event) => {
          const msg = event.data as {
            type: string;
            userId?: string;
            action?: string;
            id?: string;
          };
          if (!msg || (msg.userId && msg.userId !== userId)) return;

          if (msg.type === 'SYNC_ALL') {
            refreshAllFavoritesFromSupabase();
          } else if (msg.type === 'FAVORITE_TOGGLED' && msg.id) {
            setLikedEventIds((prev) => {
              const next = new Set(prev);
              if (msg.action === 'add') next.add(msg.id!);
              else next.delete(msg.id!);
              return next;
            });
          } else if (msg.type === 'ARTIST_FOLLOW_TOGGLED' && msg.id) {
            setFollowedArtistIds((prev) => {
              const next = new Set(prev);
              if (msg.action === 'add') next.add(msg.id!);
              else next.delete(msg.id!);
              return next;
            });
          } else if (msg.type === 'ORG_FOLLOW_TOGGLED' && msg.id) {
            setFollowedOrgIds((prev) => {
              const next = new Set(prev);
              if (msg.action === 'add') next.add(msg.id!);
              else next.delete(msg.id!);
              return next;
            });
          } else if (msg.type === 'USER_FOLLOW_TOGGLED' && msg.id) {
            setFollowedUserIds((prev) => {
              const next = new Set(prev);
              if (msg.action === 'add') next.add(msg.id!);
              else next.delete(msg.id!);
              return next;
            });
          }
        };
      }
    } catch {
      // Ignore BroadcastChannel initialization error
    }

    const handleStorage = (e: StorageEvent) => {
      if (!userId || !e.key) return;
      const likesKey = getFavoritesStorageKey('likes', userId);
      const artistsKey = getFavoritesStorageKey('artists', userId);
      const orgsKey = getFavoritesStorageKey('orgs', userId);
      const usersKey = getFavoritesStorageKey('users', userId);

      if (e.key === likesKey) setLikedEventIds(readStoredSet(likesKey));
      else if (e.key === artistsKey) setFollowedArtistIds(readStoredSet(artistsKey));
      else if (e.key === orgsKey) setFollowedOrgIds(readStoredSet(orgsKey));
      else if (e.key === usersKey) setFollowedUserIds(readStoredSet(usersKey));
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId, refreshAllFavoritesFromSupabase]);

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

    // Initial fetch from Supabase
    refreshAllFavoritesFromSupabase();

    // Supabase Realtime live sync for favorites and subscriptions
    const unsubscribe = subscribeToUserFavoritesLive(userId, {
      onLikeChange: ({ eventType, eventId }) => {
        if (eventId) {
          setLikedEventIds((prev) => {
            const next = new Set(prev);
            if (eventType === 'DELETE') next.delete(eventId);
            else next.add(eventId);
            writeStoredSet(likesKey, next);
            return next;
          });
        }
        refreshAllFavoritesFromSupabase();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-favorites-updated', { detail: { eventId, eventType } }));
        }
      },
      onArtistFollowChange: ({ eventType, artistId }) => {
        if (artistId) {
          setFollowedArtistIds((prev) => {
            const next = new Set(prev);
            if (eventType === 'DELETE') next.delete(artistId);
            else next.add(artistId);
            writeStoredSet(artistsKey, next);
            return next;
          });
        }
        refreshAllFavoritesFromSupabase();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { artistId, eventType, type: 'artist' } }));
        }
      },
      onOrgFollowChange: ({ eventType, orgId }) => {
        if (orgId) {
          setFollowedOrgIds((prev) => {
            const next = new Set(prev);
            if (eventType === 'DELETE') next.delete(orgId);
            else next.add(orgId);
            writeStoredSet(orgsKey, next);
            return next;
          });
        }
        refreshAllFavoritesFromSupabase();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { orgId, eventType, type: 'org' } }));
        }
      },
      onUserFollowChange: ({ eventType, targetUserId }) => {
        if (targetUserId) {
          setFollowedUserIds((prev) => {
            const next = new Set(prev);
            if (eventType === 'DELETE') next.delete(targetUserId);
            else next.add(targetUserId);
            writeStoredSet(usersKey, next);
            return next;
          });
        }
        refreshAllFavoritesFromSupabase();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gba-follows-updated', { detail: { userId: targetUserId, eventType, type: 'user' } }));
        }
      },
      onAnyChange: () => {
        refreshAllFavoritesFromSupabase();
      },
    });

    // Polling en arrière-plan toutes les 3 secondes max (uniquement si page active/visible)
    const periodicSync = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAllFavoritesFromSupabase();
      }
    }, 3000);

    const handleFocusSync = () => {
      refreshAllFavoritesFromSupabase();
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        refreshAllFavoritesFromSupabase();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('online', handleFocusSync);
    window.addEventListener('gba-follows-updated', handleFocusSync);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(periodicSync);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('online', handleFocusSync);
      window.removeEventListener('gba-follows-updated', handleFocusSync);
    };
  }, [userId, refreshAllFavoritesFromSupabase]);

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
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('gba_favorites_channel');
          bc.postMessage({ type: 'FAVORITE_TOGGLED', action: willBeLiked ? 'add' : 'remove', id: eventId, userId });
          bc.close();
        } catch {
          // ignore
        }
      }

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

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('gba_favorites_channel');
          bc.postMessage({ type: 'ARTIST_FOLLOW_TOGGLED', action: willFollow ? 'add' : 'remove', id: artistId, userId });
          bc.close();
        } catch {
          // ignore
        }
      }

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

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('gba_favorites_channel');
          bc.postMessage({ type: 'ORG_FOLLOW_TOGGLED', action: willFollow ? 'add' : 'remove', id: orgId, userId });
          bc.close();
        } catch {
          // ignore
        }
      }

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

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('gba_favorites_channel');
          bc.postMessage({ type: 'USER_FOLLOW_TOGGLED', action: willFollow ? 'add' : 'remove', id: targetUserId, userId });
          bc.close();
        } catch {
          // ignore
        }
      }

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

