-- 1. Notification preferences (per-user settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_comments boolean NOT NULL DEFAULT true,
  comment_replies boolean NOT NULL DEFAULT true,
  new_questions boolean NOT NULL DEFAULT true,
  question_answered boolean NOT NULL DEFAULT true,
  new_followers boolean NOT NULL DEFAULT true,
  invite_accepted boolean NOT NULL DEFAULT true,
  event_reminders boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notif_prefs" ON notification_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notif_prefs" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notif_prefs" ON notification_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notif_prefs" ON notification_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. User-to-user follows (for profile consultation between users)
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_user_follows" ON user_follows FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_user_follow" ON user_follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "delete_own_user_follow" ON user_follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- 3. RPC to increment event views (avoids client-side race)
CREATE OR REPLACE FUNCTION increment_event_views(p_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET views_count = views_count + 1 WHERE id = p_event_id;
$$;

-- 4. Enable realtime on events table (for live view counter)
ALTER PUBLICATION supabase_realtime ADD TABLE events;
