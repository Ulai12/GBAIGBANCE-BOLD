-- Signalements réellement enregistrés, plus la table notifications
-- absente du projet GBAIGBANCE EVENTS.

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'comment_reply','new_comment','new_question','question_answered',
    'new_follower','event_invite','invite_accepted','event_report'
  ));

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
  VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
END;
$$;

CREATE TABLE IF NOT EXISTS event_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reports_event ON event_reports (event_id, created_at DESC);

ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reports_insert_own" ON event_reports;
CREATE POLICY "event_reports_insert_own" ON event_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "event_reports_select_involved" ON event_reports;
CREATE POLICY "event_reports_select_involved" ON event_reports
  FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_reports.event_id AND e.organizer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION submit_event_report(
  p_event_id uuid,
  p_reason text,
  p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_organizer uuid;
  v_title text;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  v_reason := left(coalesce(nullif(trim(p_reason), ''), 'other'), 80);
  SELECT organizer_user_id, title INTO v_organizer, v_title
  FROM events WHERE id = p_event_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;
  INSERT INTO event_reports (event_id, reporter_id, reason, comment)
  VALUES (p_event_id, auth.uid(), v_reason, left(coalesce(p_comment, ''), 1000))
  RETURNING id INTO v_id;

  IF v_organizer IS NOT NULL AND v_organizer <> auth.uid() THEN
    PERFORM create_notification(
      v_organizer,
      auth.uid(),
      'event_report',
      'Signalement reçu',
      left('Un participant a signalé « ' || v_title || ' ». Motif : ' || v_reason, 180),
      'event',
      p_event_id
    );
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
  SELECT p.id, auth.uid(), 'event_report', 'Signalement à examiner',
         left(v_title || ' · ' || v_reason, 180), 'event', p_event_id
  FROM profiles p
  WHERE p.role = 'admin'
    AND p.id <> auth.uid()
    AND (v_organizer IS NULL OR p.id <> v_organizer);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_event_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, uuid, text, text, text, text, uuid) TO authenticated;
