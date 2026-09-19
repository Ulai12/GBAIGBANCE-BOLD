import { supabase } from '@/services/supabase';
import type { Event, EventCollaborator, PublicProfile } from '@/types';

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

export async function fetchCollaborators(eventId: string): Promise<EventCollaborator[]> {
  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  const collabs = (data as EventCollaborator[]) || [];
  const profileMap = await fetchProfilesByIds(collabs.map((c) => c.user_id));
  collabs.forEach((c) => {
    c.profile = profileMap.get(c.user_id);
  });
  return collabs;
}

export async function inviteCollaborator(
  eventId: string,
  userId: string,
  role: 'co_organizer' | 'performer',
  invitedBy: string
): Promise<void> {
  const { error } = await supabase.from('event_collaborators').insert({
    event_id: eventId,
    user_id: userId,
    role,
    invited_by: invitedBy,
    status: 'pending',
  });
  if (error) throw error;
}

export async function respondToInvitation(
  collaboratorId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  if (status === 'accepted') {
    const { error } = await supabase.rpc('accept_collaboration', { p_collaborator_id: collaboratorId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('event_collaborators')
      .update({ status: 'declined' })
      .eq('id', collaboratorId);
    if (error) throw error;
  }
}

export async function fetchPendingInvitations(
  userId: string
): Promise<(EventCollaborator & { event?: Event })[]> {
  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, event:events(*)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as (EventCollaborator & { event?: Event })[]) || [];
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('id', collaboratorId);
  if (error) throw error;
}
