-- Signalements réellement enregistrés (plus une alerte locale de démonstration).

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

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'comment_reply','new_comment','new_question','question_answered',
    'new_follower','event_invite','invite_accepted','event_report'
  ));

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
