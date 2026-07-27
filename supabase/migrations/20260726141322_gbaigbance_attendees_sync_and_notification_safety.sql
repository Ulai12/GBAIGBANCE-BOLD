/*
# Fix attendees_count + notification trigger safety

1. Changes
- Add trigger `sync_attendees_count_on_ticket` on `tickets` table: after insert/update/delete, recompute the event's `attendees_count` as the count of non-cancelled tickets for that event.
- Replace `create_notification` with a version that catches exceptions internally so a notification failure never aborts the triggering INSERT/UPDATE.

2. Security
- No new tables. Triggers run with SECURITY DEFINER.
*/

CREATE OR REPLACE FUNCTION sync_attendees_count() RETURNS trigger AS $$
DECLARE v_event uuid;
BEGIN
  v_event := COALESCE(NEW.event_id, OLD.event_id);
  IF v_event IS NULL THEN RETURN NULL; END IF;
  UPDATE events
    SET attendees_count = (
      SELECT count(*) FROM tickets
      WHERE event_id = v_event AND status <> 'cancelled'
    )
    WHERE id = v_event;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_attendees_insert ON tickets;
CREATE TRIGGER trg_sync_attendees_insert AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

DROP TRIGGER IF EXISTS trg_sync_attendees_update ON tickets;
CREATE TRIGGER trg_sync_attendees_update AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

DROP TRIGGER IF EXISTS trg_sync_attendees_delete ON tickets;
CREATE TRIGGER trg_sync_attendees_delete AFTER DELETE ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

-- Re-sync existing events now
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT event_id FROM tickets WHERE status <> 'cancelled' LOOP
    UPDATE events SET attendees_count = (
      SELECT count(*) FROM tickets WHERE event_id = r.event_id AND status <> 'cancelled'
    ) WHERE id = r.event_id;
  END LOOP;
  UPDATE events SET attendees_count = 0
    WHERE id NOT IN (SELECT DISTINCT event_id FROM tickets WHERE status <> 'cancelled');
END $$;

-- Make create_notification swallow errors so it never breaks the caller transaction
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
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
    VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
