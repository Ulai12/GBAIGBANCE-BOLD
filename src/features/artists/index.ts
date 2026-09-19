/**
 * GBAIGBANCE Feature - Artists
 */

import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { isRealArtist, isRealEvent } from '@/features/events/status';
import type { Artist, Event } from '@/types';

export async function fetchFeaturedArtists(): Promise<Artist[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const [artistsRes, profilesRes, eventsRes, followsRes] = await Promise.all([
      supabase.from('artists').select('*').limit(30),
      supabase.from('profiles').select('*').eq('role', 'artist').limit(30),
      supabase.from('events').select('id, organizer_user_id, status').eq('status', 'published'),
      supabase.from('artist_follows').select('artist_id'),
    ]);

    const eventsList = (eventsRes.data || []) as { organizer_user_id?: string }[];
    const eventCountByUser: Record<string, number> = {};
    eventsList.forEach((e) => {
      if (e.organizer_user_id) {
        eventCountByUser[e.organizer_user_id] = (eventCountByUser[e.organizer_user_id] || 0) + 1;
      }
    });

    const followsList = (followsRes.data || []) as { artist_id: string }[];
    const followsByArtist: Record<string, number> = {};
    followsList.forEach((f) => {
      followsByArtist[f.artist_id] = (followsByArtist[f.artist_id] || 0) + 1;
    });

    const list: Artist[] = [];
    if (artistsRes.data) {
      artistsRes.data.forEach((a: Artist) => {
        if (isRealArtist(a)) {
          list.push({
            ...a,
            followers_count: Math.max(a.followers_count || 0, followsByArtist[a.id] || 0),
          });
        }
      });
    }

    if (profilesRes.data) {
      profilesRes.data.forEach((p) => {
        if (!list.some((existing) => existing.id === p.id || existing.name.toLowerCase() === p.name.toLowerCase())) {
          list.push({
            id: p.id,
            name: p.name,
            bio: p.bio || undefined,
            avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
            cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
            genre: (p.preferred_genres && p.preferred_genres[0]) || 'Afrobeats',
            country: p.country || 'Togo',
            social_links: {},
            verified: true,
            followers_count: followsByArtist[p.id] || 0,
            events_count: eventCountByUser[p.id] || 0,
            created_at: p.created_at,
          });
        }
      });
    }

    return list.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
  } catch {
    return [];
  }
}

export async function fetchArtistById(artistId: string): Promise<Artist | null> {
  if (!isSupabaseConfigured || !artistId) return null;
  try {
    const { data: artistData } = await supabase.from('artists').select('*').eq('id', artistId).maybeSingle();
    if (artistData && isRealArtist(artistData)) return artistData as Artist;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', artistId).maybeSingle();
    if (profileData) {
      return {
        id: profileData.id,
        name: profileData.name,
        bio: profileData.bio || undefined,
        avatar_url: profileData.avatar_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
        cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
        genre: (profileData.preferred_genres && profileData.preferred_genres[0]) || 'Afrobeats',
        country: profileData.country || 'Togo',
        social_links: {},
        verified: true,
        followers_count: 0,
        events_count: 0,
        created_at: profileData.created_at,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchEventsByArtist(artistId: string): Promise<Event[]> {
  if (!isSupabaseConfigured || !artistId) return [];
  try {
    const [byUser, byLink] = await Promise.all([
      supabase.from('events').select('*').eq('organizer_user_id', artistId).eq('status', 'published').order('starts_at', { ascending: false }),
      supabase.from('events').select(`*, event_artists!inner (artist_id)`).eq('event_artists.artist_id', artistId).eq('status', 'published').order('starts_at', { ascending: false })
    ]);

    const combined = [
      ...(((byUser.data as Event[]) || [])),
      ...(((byLink.data as unknown as Event[]) || []))
    ];
    const map = new Map<string, Event>();
    combined.forEach((e) => {
      if (e && e.id && isRealEvent(e)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}
