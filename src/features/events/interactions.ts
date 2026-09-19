import { supabase } from '@/services/supabase';
import type { EventComment, EventReaction, EventQuestion, PublicProfile } from '@/types';

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

export async function fetchEventComments(eventId: string): Promise<EventComment[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const comments = (data as EventComment[]) || [];
  const profileMap = await fetchProfilesByIds(comments.map((c) => c.user_id));
  comments.forEach((c) => {
    c.profile = profileMap.get(c.user_id);
  });
  return comments;
}

export async function addEventComment(
  eventId: string,
  _userId: string,
  body: string,
  isOrganizerReply = false
): Promise<void> {
  const { error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, body, is_organizer_reply: isOrganizerReply });
  if (error) throw new Error(error.message);
}

export async function deleteEventComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}

export async function fetchEventReactions(eventId: string): Promise<EventReaction[]> {
  const { data, error } = await supabase.from('event_reactions').select('*').eq('event_id', eventId);
  if (error) throw error;
  return (data as EventReaction[]) || [];
}

export async function toggleEventReaction(eventId: string, userId: string, emoji: string): Promise<void> {
  const { data: existing } = await supabase
    .from('event_reactions')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabase.from('event_reactions').delete().eq('id', existing.id);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { error: insErr } = await supabase.from('event_reactions').insert({ event_id: eventId, emoji });
    if (insErr) throw new Error(insErr.message);
  }
}

export async function fetchEventQuestions(eventId: string): Promise<EventQuestion[]> {
  const { data, error } = await supabase
    .from('event_questions')
    .select('*')
    .eq('event_id', eventId)
    .order('answered_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  const questions = (data as EventQuestion[]) || [];
  const ids = questions.flatMap((q) => [q.user_id, q.answered_by].filter(Boolean) as string[]);
  const profileMap = await fetchProfilesByIds(ids);
  questions.forEach((q) => {
    q.profile = profileMap.get(q.user_id);
    if (q.answered_by) q.answerer = profileMap.get(q.answered_by);
  });
  return questions;
}

export async function addEventQuestion(eventId: string, _userId: string, question: string): Promise<void> {
  const { error } = await supabase.from('event_questions').insert({ event_id: eventId, question });
  if (error) throw new Error(error.message);
}

export async function answerEventQuestion(
  questionId: string,
  answer: string,
  answeredBy: string
): Promise<void> {
  const { error } = await supabase
    .from('event_questions')
    .update({ answer, answered_by: answeredBy, answered_at: new Date().toISOString() })
    .eq('id', questionId);
  if (error) throw new Error(error.message);
}

export async function toggleOrganizationFollow(organizationId: string, userId: string): Promise<boolean> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(organizationId) || !UUID_REGEX.test(userId)) {
    return true;
  }
  const { data: existing } = await supabase
    .from('organization_follows')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('organization_follows').delete().eq('id', existing.id);
    return false;
  }
  await supabase.from('organization_follows').insert({ organization_id: organizationId, user_id: userId });
  return true;
}

export async function toggleEventLike(eventId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('event_likes')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('event_likes').delete().eq('event_id', eventId).eq('user_id', userId);
    await supabase.rpc('decrement_likes_count', { event_id: eventId });
    return false;
  }
  await supabase.from('event_likes').insert({ event_id: eventId, user_id: userId });
  await supabase.rpc('increment_likes_count', { event_id: eventId });
  return true;
}

export async function toggleArtistFollow(artistId: string, userId: string): Promise<boolean> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(artistId) || !UUID_REGEX.test(userId)) {
    return true;
  }
  const { data: existing } = await supabase
    .from('artist_follows')
    .select('*')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('artist_follows').delete().eq('artist_id', artistId).eq('user_id', userId);
    return false;
  }
  await supabase.from('artist_follows').insert({ artist_id: artistId, user_id: userId });
  return true;
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

export async function incrementEventViews(eventId: string): Promise<void> {
  if (!isSupabaseConfigured || !eventId) return;
  try {
    await supabase.rpc('increment_event_views', { p_event_id: eventId });
  } catch {
    // Ignore error
  }
}

export function subscribeToEventViews(eventId: string, callback: (views: number) => void) {
  if (!isSupabaseConfigured || !eventId) return () => {};
  const channel = supabase
    .channel(`event-views-${eventId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
      (payload) => {
        if (payload.new && typeof (payload.new as { views_count?: number }).views_count === 'number') {
          callback((payload.new as { views_count: number }).views_count);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToEventAttendees(eventId: string, callback: (count: number) => void) {
  if (!isSupabaseConfigured || !eventId) return () => {};
  const channel = supabase
    .channel(`event-attendees-${eventId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
      (payload) => {
        if (payload.new && typeof (payload.new as { attendees_count?: number }).attendees_count === 'number') {
          callback((payload.new as { attendees_count: number }).attendees_count);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
