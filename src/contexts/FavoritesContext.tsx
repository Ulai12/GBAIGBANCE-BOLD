import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useApp } from '@/hooks/useApp';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import {
  toggleEventLike as apiToggleEventLike,
  toggleArtistFollow as apiToggleArtistFollow,
  toggleOrganizationFollow as apiToggleOrgFollow,
} from '@/services/events';

interface FavoritesContextValue {
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

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_LIKES_KEY = 'gba_liked_event_ids_v1';
const STORAGE_ARTIST_FOLLOWS_KEY = 'gba_followed_artists_v1';
const STORAGE_ORG_FOLLOWS_KEY = 'gba_followed_orgs_v1';

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
  const [likedEventIds, setLikedEventIds] = useState<Set<string>>(() => readStoredSet(STORAGE_LIKES_KEY));
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(() => readStoredSet(STORAGE_ARTIST_FOLLOWS_KEY));
  const [followedOrgIds, setFollowedOrgIds] = useState<Set<string>>(() => readStoredSet(STORAGE_ORG_FOLLOWS_KEY));

  // Sync with Supabase on user mount or change
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;

    // Fetch user event likes
    supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const dbLikes = new Set(data.map((r) => r.event_id as string));
          setLikedEventIds((prev) => {
            const merged = new Set([...prev, ...dbLikes]);
            writeStoredSet(STORAGE_LIKES_KEY, merged);
            return merged;
          });
        }
      });

    // Fetch user followed artists
    supabase
      .from('artist_follows')
      .select('artist_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const dbArtists = new Set(data.map((r) => r.artist_id as string));
          setFollowedArtistIds((prev) => {
            const merged = new Set([...prev, ...dbArtists]);
            writeStoredSet(STORAGE_ARTIST_FOLLOWS_KEY, merged);
            return merged;
          });
        }
      });

    // Fetch user followed organizations
    supabase
      .from('organization_follows')
      .select('organization_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const dbOrgs = new Set(data.map((r) => r.organization_id as string));
          setFollowedOrgIds((prev) => {
            const merged = new Set([...prev, ...dbOrgs]);
            writeStoredSet(STORAGE_ORG_FOLLOWS_KEY, merged);
            return merged;
          });
        }
      });
  }, [user?.id]);

  const isLiked = useCallback(
    (eventId: string) => likedEventIds.has(eventId),
    [likedEventIds]
  );

  const toggleLike = useCallback(
    async (eventId: string): Promise<boolean> => {
      const willBeLiked = !likedEventIds.has(eventId);

      // Optimistic update
      setLikedEventIds((prev) => {
        const next = new Set(prev);
        if (willBeLiked) next.add(eventId);
        else next.delete(eventId);
        writeStoredSet(STORAGE_LIKES_KEY, next);
        return next;
      });

      if (isSupabaseConfigured && user?.id) {
        try {
          await apiToggleEventLike(eventId, user.id);
        } catch {
          // Revert if API fails
          setLikedEventIds((prev) => {
            const next = new Set(prev);
            if (willBeLiked) next.delete(eventId);
            else next.add(eventId);
            writeStoredSet(STORAGE_LIKES_KEY, next);
            return next;
          });
          return !willBeLiked;
        }
      }

      return willBeLiked;
    },
    [likedEventIds, user?.id]
  );

  const isFollowingArtist = useCallback(
    (artistId: string) => followedArtistIds.has(artistId),
    [followedArtistIds]
  );

  const toggleFollowArtist = useCallback(
    async (artistId: string): Promise<boolean> => {
      const willFollow = !followedArtistIds.has(artistId);

      setFollowedArtistIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(artistId);
        else next.delete(artistId);
        writeStoredSet(STORAGE_ARTIST_FOLLOWS_KEY, next);
        return next;
      });

      if (isSupabaseConfigured && user?.id) {
        try {
          await apiToggleArtistFollow(artistId, user.id);
        } catch {
          setFollowedArtistIds((prev) => {
            const next = new Set(prev);
            if (willFollow) next.delete(artistId);
            else next.add(artistId);
            writeStoredSet(STORAGE_ARTIST_FOLLOWS_KEY, next);
            return next;
          });
          return !willFollow;
        }
      }

      return willFollow;
    },
    [followedArtistIds, user?.id]
  );

  const isFollowingOrg = useCallback(
    (orgId: string) => followedOrgIds.has(orgId),
    [followedOrgIds]
  );

  const toggleFollowOrg = useCallback(
    async (orgId: string): Promise<boolean> => {
      const willFollow = !followedOrgIds.has(orgId);

      setFollowedOrgIds((prev) => {
        const next = new Set(prev);
        if (willFollow) next.add(orgId);
        else next.delete(orgId);
        writeStoredSet(STORAGE_ORG_FOLLOWS_KEY, next);
        return next;
      });

      if (isSupabaseConfigured && user?.id) {
        try {
          await apiToggleOrgFollow(orgId, user.id);
        } catch {
          setFollowedOrgIds((prev) => {
            const next = new Set(prev);
            if (willFollow) next.delete(orgId);
            else next.add(orgId);
            writeStoredSet(STORAGE_ORG_FOLLOWS_KEY, next);
            return next;
          });
          return !willFollow;
        }
      }

      return willFollow;
    },
    [followedOrgIds, user?.id]
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

const defaultFavoritesContextFallback: FavoritesContextType = {
  likedEventIds: new Set<string>(),
  isLiked: () => false,
  toggleLike: () => {},
  followedArtistIds: new Set<string>(),
  isFollowingArtist: () => false,
  toggleFollowArtist: () => {},
  followedOrgIds: new Set<string>(),
  isFollowingOrg: () => false,
  toggleFollowOrg: () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    if (import.meta.env.DEV) {
      console.warn('[useFavorites] FavoritesContext is temporarily unavailable (HMR or mounting outside FavoritesProvider). Using fallback.');
    }
    return defaultFavoritesContextFallback;
  }
  return context;
}
