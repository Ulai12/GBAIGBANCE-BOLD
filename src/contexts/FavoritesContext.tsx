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
  type: 'favorite' | 'artist_follow' | 'org_follow' | 'ticket';
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
};

const FavoritesContext = createContext<FavoritesContextValue>(defaultFavoritesContextFallback);

const STORAGE_LIKES_KEY = 'gba_liked_event_ids_v1';
const STORAGE_ARTIST_FOLLOWS_KEY = 'gba_followed_artists_v1';
const STORAGE_ORG_FOLLOWS_KEY = 'gba_followed_orgs_v1';

export function getFavoritesStorageKey(type: 'likes' | 'artists' | 'orgs', userId?: string | null): string {
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
    localStorage.removeItem('gba_fav_events_cache');
    // Purge guest keys
    localStorage.removeItem('gba_guest_likes_v1');
    localStorage.removeItem('gba_guest_artists_v1');
    localStorage.removeItem('gba_guest_orgs_v1');
    // Purge user-specific keys if userId given
    if (userId) {
      localStorage.removeItem(getFavoritesStorageKey('likes', userId));
      localStorage.removeItem(getFavoritesStorageKey('artists', userId));
      localStorage.removeItem(getFavoritesStorageKey('orgs', userId));
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

  // Clear immediately when signed out
  useEffect(() => {
    const handleSignedOut = () => {
      setLikedEventIds(new Set());
      setFollowedArtistIds(new Set());
      setFollowedOrgIds(new Set());
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

    if (!userId) {
      // Guest mode - load guest state
      setLikedEventIds(readStoredSet(likesKey));
      setFollowedArtistIds(readStoredSet(artistsKey));
      setFollowedOrgIds(readStoredSet(orgsKey));
      return;
    }

    // Authenticated user - populate local user cache first
    setLikedEventIds(readStoredSet(likesKey));
    setFollowedArtistIds(readStoredSet(artistsKey));
    setFollowedOrgIds(readStoredSet(orgsKey));

    if (!isSupabaseConfigured) return;

    // Fetch user event likes from Supabase
    supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const dbLikes = new Set(data.map((r) => r.event_id as string));
          setLikedEventIds((prev) => {
            const merged = new Set([...prev, ...dbLikes]);
            writeStoredSet(likesKey, merged);
            return merged;
          });
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
          setFollowedArtistIds((prev) => {
            const merged = new Set([...prev, ...dbArtists]);
            writeStoredSet(artistsKey, merged);
            return merged;
          });
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
          setFollowedOrgIds((prev) => {
            const merged = new Set([...prev, ...dbOrgs]);
            writeStoredSet(orgsKey, merged);
            return merged;
          });
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

    return () => {
      if (unsubscribe) unsubscribe();
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

      // 1. Immediate haptic feedback (Taptic pulse)
      haptic.medium();

      // 2. Instantaneous optimistic state update (0ms latency)
      setLikedEventIds((prev) => {
        const next = new Set(prev);
        if (willBeLiked) next.add(eventId);
        else next.delete(eventId);
        writeStoredSet(likesKey, next);
        return next;
      });

      // 3. Asynchronous background network sync
      if (isSupabaseConfigured && userId) {
        apiToggleEventLike(eventId, userId).catch(() => {
          // Transparent rollback on failure
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

      // Resolves immediately so callers can animate and display toasts without waiting
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

      // 1. Immediate tactile confirmation
      haptic.selection();

      // 2. Instantaneous optimistic state update (0ms latency)
      setFollowedArtistIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(artistId);
        else next.delete(artistId);
        writeStoredSet(artistsKey, next);
        return next;
      });

      // 3. Background network sync
      if (isSupabaseConfigured && userId) {
        apiToggleArtistFollow(artistId, userId).catch(() => {
          // Transparent rollback on network error
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

      // 1. Immediate tactile confirmation
      haptic.selection();

      // 2. Instantaneous optimistic state update (0ms latency)
      setFollowedOrgIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(orgId);
        else next.delete(orgId);
        writeStoredSet(orgsKey, next);
        return next;
      });

      // 3. Background network sync
      if (isSupabaseConfigured && userId) {
        apiToggleOrgFollow(orgId, userId).catch(() => {
          // Transparent rollback on network error
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

      return Promise.resolve(willFollow);
    },
    [followedOrgIds, userId]
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
