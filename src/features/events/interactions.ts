import { supabase, isSupabaseConfigured } from '@/services/supabase';
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

function assertRpcOk(error: { message?: string } | null, data: unknown, fallback: string): Record<string, unknown> {
  if (error) throw new Error(error.message || fallback);
  if (!data || typeof data !== 'object') throw new Error(fallback);
  const rec = data as Record<string, unknown>;
  if (rec.success === false) {
    throw new Error(typeof rec.error === 'string' ? rec.error : fallback);
  }
  return rec;
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
    throw new Error('Identifiant d’organisation ou utilisateur invalide.');
  }

  const { data: existing, error: selectError } = await supabase
    .from('organization_follows')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);

  if (existing) {
    const { error } = await supabase
      .from('organization_follows')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase
    .from('organization_follows')
    .upsert(
      { organization_id: organizationId, user_id: userId },
      { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  return true;
}

/** Favori / like evenement — RPC atomique, avec repli compatible si la RPC manque. */
export async function toggleEventLike(eventId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_event_like', {
    p_event_id: eventId,
  });

  if (!error) {
    const rec = assertRpcOk(null, data, 'Impossible de mettre en favori');
    return rec.liked === true;
  }

  // Certaines bases n'ont pas encore reçu la migration RPC. La table event_likes
  // et ses policies RLS existent déjà : on utilise alors le chemin SQL standard.
  const rpcUnavailable =
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    (/toggle_event_like/i.test(error.message || '') &&
      /(schema cache|could not find|does not exist|not found)/i.test(error.message || ''));

  if (!rpcUnavailable) {
    throw new Error(error.message || 'Impossible de mettre en favori');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authError || !user) {
    throw new Error('Connectez-vous pour gérer vos favoris.');
  }

  const { data: existing, error: selectError } = await supabase
    .from('event_likes')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (existing) {
    const { error: deleteError } = await supabase
      .from('event_likes')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    if (deleteError) throw new Error(deleteError.message);
    return false;
  }

  const { error: insertError } = await supabase
    .from('event_likes')
    .insert({ event_id: eventId, user_id: user.id });
  if (insertError) {
    // Un second clic ou un autre onglet peut avoir créé le même like entre-temps.
    if (insertError.code === '23505') return true;
    throw new Error(insertError.message);
  }

  return true;
}

export async function toggleArtistFollow(artistId: string, userId: string): Promise<boolean> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(artistId) || !UUID_REGEX.test(userId)) {
    throw new Error('Identifiant d’artiste ou utilisateur invalide.');
  }

  const { data: existing, error: selectError } = await supabase
    .from('artist_follows')
    .select('artist_id')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);

  if (existing) {
    const { error } = await supabase
      .from('artist_follows')
      .delete()
      .eq('artist_id', artistId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase
    .from('artist_follows')
    .upsert({ artist_id: artistId, user_id: userId }, { onConflict: 'artist_id,user_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return true;
}

export async function isFollowingArtist(artistId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('artist_follows')
    .select('artist_id')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

const ANALYTICS_VISITOR_KEY = 'gba_analytics_visitor_v1';

function getAnalyticsVisitorKey(): string {
  try {
    const existing = localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(ANALYTICS_VISITOR_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export async function incrementEventViews(eventId: string): Promise<void> {
  if (!isSupabaseConfigured || !eventId) return;
  try {
    const { error } = await supabase.rpc('record_event_view', {
      p_event_id: eventId,
      p_visitor_key: getAnalyticsVisitorKey(),
    });
    if (error) {
      // Fallback simple si la dedup daily echoue
      await supabase.rpc('increment_event_views', { p_event_id: eventId });
    }
  } catch (error) {
    console.warn('[event-views] Unable to record view:', error);
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
