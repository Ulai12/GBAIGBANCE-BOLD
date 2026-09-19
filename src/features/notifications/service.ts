import { supabase } from '@/services/supabase';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  actor?: { name: string; avatar_url: string | null } | null;
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  const notifications = (data as Notification[]) || [];
  const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter(Boolean) as string[])];

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', actorIds);

    const actorMap = new Map(
      (actors || []).map((a: { id: string; name: string; avatar_url: string | null }) => [
        a.id,
        { name: a.name, avatar_url: a.avatar_url },
      ])
    );

    notifications.forEach((n) => {
      if (n.actor_id) n.actor = actorMap.get(n.actor_id) || null;
    });
  }

  return notifications;
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(error.message);
}

// ==================== NOTIFICATION PREFERENCES ====================

export interface NotificationPreferences {
  user_id: string;
  new_comments: boolean;
  comment_replies: boolean;
  new_questions: boolean;
  question_answered: boolean;
  new_followers: boolean;
  invite_accepted: boolean;
  event_reminders: boolean;
  push_enabled: boolean;
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const defaults: NotificationPreferences = {
      user_id: userId,
      new_comments: true,
      comment_replies: true,
      new_questions: true,
      question_answered: true,
      new_followers: true,
      invite_accepted: true,
      event_reminders: true,
      push_enabled: false,
    };
    const { data: inserted, error: insError } = await supabase
      .from('notification_preferences')
      .insert(defaults)
      .select()
      .maybeSingle();
    if (insError) return defaults;
    return (inserted as NotificationPreferences) || defaults;
  }
  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .update({ ...prefs, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
