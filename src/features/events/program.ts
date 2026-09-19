import { supabase } from '@/services/supabase';
import type { EventScheduleSlot, Artist, EventLiveLink, EventSponsor, SponsorTier } from '@/types';

export async function fetchEventSchedule(eventId: string): Promise<(EventScheduleSlot & { artist?: Artist })[]> {
  const { data, error } = await supabase
    .from('event_schedule')
    .select(`*, artist:artists!event_schedule_artist_id_fkey(id, name, photo_url, is_verified, genres)`)
    .eq('event_id', eventId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data as (EventScheduleSlot & { artist?: Artist })[]) || [];
}

export async function addScheduleSlot(slot: Omit<EventScheduleSlot, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('event_schedule').insert(slot);
  if (error) throw new Error(error.message);
}

export async function updateScheduleSlot(id: string, updates: Partial<EventScheduleSlot>): Promise<void> {
  const { error } = await supabase.from('event_schedule').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  const { error } = await supabase.from('event_schedule').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchEventLiveLinks(eventId: string): Promise<EventLiveLink[]> {
  const { data, error } = await supabase
    .from('event_live_links')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EventLiveLink[]) || [];
}

export async function addEventLiveLink(eventId: string, platform: string, url: string, title?: string): Promise<void> {
  const { error } = await supabase.from('event_live_links').insert({ event_id: eventId, platform, url, title });
  if (error) throw new Error(error.message);
}

export async function toggleLiveLink(linkId: string, isLive: boolean): Promise<void> {
  const { error } = await supabase.from('event_live_links').update({ is_live: isLive }).eq('id', linkId);
  if (error) throw new Error(error.message);
}

export async function deleteEventLiveLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('event_live_links').delete().eq('id', linkId);
  if (error) throw new Error(error.message);
}

export async function fetchEventSponsors(eventId: string): Promise<EventSponsor[]> {
  const { data, error } = await supabase
    .from('event_sponsors')
    .select('*')
    .eq('event_id', eventId)
    .order('tier', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EventSponsor[]) || [];
}

export async function addEventSponsor(sponsor: {
  event_id: string;
  name: string;
  website_url?: string;
  logo_url?: string;
  tier: SponsorTier;
  logo_source?: 'auto' | 'manual';
}): Promise<void> {
  const { error } = await supabase.from('event_sponsors').insert(sponsor);
  if (error) throw new Error(error.message);
}

export async function updateEventSponsor(id: string, updates: Partial<EventSponsor>): Promise<void> {
  const { error } = await supabase.from('event_sponsors').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEventSponsor(id: string): Promise<void> {
  const { error } = await supabase.from('event_sponsors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function getFaviconUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  } catch {
    return '';
  }
}
