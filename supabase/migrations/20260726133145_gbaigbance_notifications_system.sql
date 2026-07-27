/*
# Notifications system for Gbaigbance

1. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null) — the recipient
  - `actor_id` (uuid, nullable) — the user who triggered the notification
  - `type` (text, not null) — comment_reply | new_comment | new_question | question_answered | new_follower | event_invite | invite_accepted
  - `entity_type` (text, nullable) — 'event' | 'artist' | 'organization' | 'comment' | 'question'
  - `entity_id` (uuid, nullable)
  - `title` (text, not null)
  - `body` (text, nullable)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled, owner-scoped CRUD.

3. Triggers
- Notify organizer on new comment, comment author on organizer reply, organizer on new question, question author on answer.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('comment_reply','new_comment','new_question','question_answered','new_follower','event_invite','invite_accepted')),
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
) RETURNS void AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
  VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_organizer_on_comment() RETURNS trigger AS $$
DECLARE v_organizer uuid;
BEGIN
  SELECT organizer_user_id INTO v_organizer FROM events WHERE id = NEW.event_id;
  IF v_organizer IS NOT NULL THEN
    PERFORM create_notification(v_organizer, NEW.user_id, 'new_comment', 'Nouveau commentaire', 'Quelqu''un a commente votre evenement.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_organizer_on_comment ON event_comments;
CREATE TRIGGER trg_notify_organizer_on_comment AFTER INSERT ON event_comments FOR EACH ROW EXECUTE FUNCTION notify_organizer_on_comment();

CREATE OR REPLACE FUNCTION notify_author_on_reply() RETURNS trigger AS $$
DECLARE v_parent_author uuid; v_event_title text;
BEGIN
  IF NEW.is_organizer_reply = true AND NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM event_comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL THEN
      SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;
      PERFORM create_notification(v_parent_author, NEW.user_id, 'comment_reply', 'Reponse de l''organisateur', 'L''organisateur a repondu a votre commentaire.', 'event', NEW.event_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_author_on_reply ON event_comments;
CREATE TRIGGER trg_notify_author_on_reply AFTER INSERT ON event_comments FOR EACH ROW EXECUTE FUNCTION notify_author_on_reply();

CREATE OR REPLACE FUNCTION notify_organizer_on_question() RETURNS trigger AS $$
DECLARE v_organizer uuid;
BEGIN
  SELECT organizer_user_id INTO v_organizer FROM events WHERE id = NEW.event_id;
  IF v_organizer IS NOT NULL THEN
    PERFORM create_notification(v_organizer, NEW.user_id, 'new_question', 'Nouvelle question', 'Quelqu''un a pose une question sur votre evenement.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_organizer_on_question ON event_questions;
CREATE TRIGGER trg_notify_organizer_on_question AFTER INSERT ON event_questions FOR EACH ROW EXECUTE FUNCTION notify_organizer_on_question();

CREATE OR REPLACE FUNCTION notify_author_on_answer() RETURNS trigger AS $$
DECLARE v_old_answer text;
BEGIN
  v_old_answer := COALESCE(OLD.answer, '');
  IF NEW.answer IS NOT NULL AND v_old_answer = '' AND NEW.answered_by IS NOT NULL THEN
    PERFORM create_notification(NEW.user_id, NEW.answered_by, 'question_answered', 'Question repondue', 'L''organisateur a repondu a votre question.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_author_on_answer ON event_questions;
CREATE TRIGGER trg_notify_author_on_answer AFTER UPDATE ON event_questions FOR EACH ROW EXECUTE FUNCTION notify_author_on_answer();
