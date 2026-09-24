/**
 * GBAIGBANCE Feature - Artists
 */

import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { isRealArtist, isRealEvent, isEventTerminated } from '@/features/events/status';
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
            user_id: p.id,
            name: p.name,
            bio: p.bio || null,
            photo_url: p.avatar_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
            cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
            genres: (p.preferred_genres && p.preferred_genres.length > 0) ? p.preferred_genres : ['Afrobeats'],
            city: p.city || 'Lomé',
            country: p.country || 'Togo',
            is_verified: true,
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
        user_id: profileData.id,
        name: profileData.name,
        bio: profileData.bio || null,
        photo_url: profileData.avatar_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
        cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
        genres: (profileData.preferred_genres && profileData.preferred_genres.length > 0) ? profileData.preferred_genres : ['Afrobeats'],
        city: profileData.city || 'Lomé',
        country: profileData.country || 'Togo',
        is_verified: true,
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

function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input.replace(/[,().:%*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export async function fetchArtistStats(artistId: string): Promise<{ totalEvents: number; totalFollowers: number; upcomingEvents: number; totalViews: number }> {
  const defaultStats = { totalEvents: 0, totalFollowers: 0, upcomingEvents: 0, totalViews: 0 };
  if (!isSupabaseConfigured || !artistId) return defaultStats;
  try {
    const { data: artistEvents } = await supabase.from('event_artists').select('event_id').eq('artist_id', artistId);
    const eventIds = (artistEvents || []).map((r: { event_id: string }) => r.event_id);
    const { count: followersCount } = await supabase.from('artist_follows').select('id', { count: 'exact', head: true }).eq('artist_id', artistId);
    if (eventIds.length === 0) {
      return { totalEvents: 0, totalFollowers: followersCount || 0, upcomingEvents: 0, totalViews: 0 };
    }
    const { data: rawEvents } = await supabase.from('events').select('views_count, starts_at, status, id, title').in('id', eventIds);
    const events = ((rawEvents || []) as Event[]).filter(isRealEvent);
    return {
      totalEvents: events.length,
      totalFollowers: followersCount || 0,
      upcomingEvents: events.filter((e) => e.status === 'published' && !isEventTerminated(e)).length,
      totalViews: events.reduce((s, e) => s + (e.views_count || 0), 0),
    };
  } catch {
    return defaultStats;
  }
}

export async function searchArtists(query: string): Promise<Artist[]> {
  const sanitized = sanitizeSearchInput(query);
  if (!sanitized) return [];
  const { data: seedArtists, error: err1 } = await supabase
    .from('artists')
    .select('*')
    .or(`name.ilike.%${sanitized}%,city.ilike.%${sanitized}%`)
    .limit(20);
  if (err1) throw err1;
  const { data: profileArtists, error: err2 } = await supabase
    .from('profiles')
    .select('id, name, bio, avatar_url, city, country, created_at')
    .eq('role', 'artist')
    .ilike('name', `%${sanitized}%`)
    .limit(20);
  if (err2) throw err2;
  const fromProfiles = (profileArtists || []).map((p: { id: string; name: string; bio?: string | null; avatar_url?: string | null; city?: string | null; country?: string | null; created_at?: string }) => ({
    id: p.id || '', user_id: p.id, name: p.name || '', bio: p.bio || null, photo_url: p.avatar_url || null, cover_url: null,
    genres: [], city: p.city || 'Lomé', country: p.country || 'TG', instagram_url: null, twitter_url: null,
    youtube_url: null, spotify_url: null, followers_count: 0, events_count: 0, is_verified: false, created_at: p.created_at || new Date().toISOString(),
  })) as Artist[];
  const seen = new Set<string>();
  const merged = [...(seedArtists || []), ...fromProfiles].filter((a) => {
    const key = a.user_id || a.id;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return merged as Artist[];
}

export async function toggleArtistFollow(artistId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('artist_follows')
    .select('id')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('artist_follows').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('artist_follows').insert({ artist_id: artistId, user_id: userId });
    return true;
  }
}

export async function isFollowingArtist(artistId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('artist_follows')
    .select('id')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
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
