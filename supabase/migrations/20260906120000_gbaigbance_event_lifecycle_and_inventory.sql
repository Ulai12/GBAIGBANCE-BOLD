/*
  Event lifecycle, inventory and ticket quantity consistency.

  Lifecycle status is separate from inventory:
  - draft, pending, published, paused, suspended, cancelled, completed
  - sold out is derived from ticket_options, never stored as event status
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_status_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'pending', 'published', 'paused', 'suspended', 'cancelled', 'completed'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS sales_start_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sales_end_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_option_id uuid REFERENCES ticket_options(id) ON DELETE SET NULL;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_quantity_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_quantity_check CHECK (quantity > 0);

CREATE INDEX IF NOT EXISTS events_sales_window_idx ON events(sales_start_at, sales_end_at);

CREATE OR REPLACE FUNCTION sync_attendees_count() RETURNS trigger AS $$
DECLARE
  affected_event uuid;
BEGIN
  affected_event := COALESCE(NEW.event_id, OLD.event_id);
  IF affected_event IS NULL THEN RETURN NULL; END IF;

  UPDATE events
  SET attendees_count = COALESCE((
    SELECT SUM(quantity) FROM tickets
    WHERE event_id = affected_event AND status IN ('active', 'used')
  ), 0),
  updated_at = now()
  WHERE id = affected_event;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION book_ticket(p_event_id uuid, p_ticket_option_id uuid, p_quantity integer DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_row events%ROWTYPE;
  option_row ticket_options%ROWTYPE;
  ticket_row tickets%ROWTYPE;
  available integer;
  event_end timestamptz;
  qr text;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RETURN json_build_object('success', false, 'error', 'La quantité doit être comprise entre 1 et 20');
  END IF;

  SELECT * INTO event_row FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Événement introuvable'); END IF;
  IF event_row.status <> 'published' THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas ouvertes pour cet événement');
  END IF;

  event_end := COALESCE(event_row.ends_at, event_row.starts_at);
  IF event_end <= now() THEN
    UPDATE events SET status = 'completed', updated_at = now() WHERE id = event_row.id AND status = 'published';
    RETURN json_build_object('success', false, 'error', 'Cet événement est terminé');
  END IF;
  IF event_row.sales_start_at IS NOT NULL AND now() < event_row.sales_start_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas encore ouvertes');
  END IF;
  IF event_row.sales_end_at IS NOT NULL AND now() >= event_row.sales_end_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes sont terminées');
  END IF;

  SELECT * INTO option_row FROM ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Option de billet introuvable'); END IF;

  available := option_row.quantity_total - option_row.quantity_sold;
  IF available < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Plus assez de billets disponibles');
  END IF;
  IF event_row.capacity IS NOT NULL AND event_row.attendees_count + p_quantity > event_row.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;

  qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO tickets (event_id, user_id, ticket_type, ticket_option_id, price_paid, currency, qr_code, status, quantity)
  VALUES (p_event_id, auth.uid(), option_row.ticket_type, option_row.id, option_row.price * p_quantity, event_row.currency, qr, 'active', p_quantity)
  RETURNING * INTO ticket_row;

  UPDATE ticket_options SET quantity_sold = quantity_sold + p_quantity WHERE id = option_row.id;

  RETURN json_build_object('success', true, 'ticket', row_to_json(ticket_row));
END;
$$;

CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ticket_row tickets%ROWTYPE;
BEGIN
  SELECT * INTO ticket_row FROM tickets
  WHERE id = p_ticket_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Billet introuvable'); END IF;
  IF ticket_row.status <> 'active' THEN RETURN json_build_object('success', false, 'error', 'Billet déjà annulé ou utilisé'); END IF;

  UPDATE tickets SET status = 'cancelled' WHERE id = p_ticket_id;
  UPDATE ticket_options
  SET quantity_sold = GREATEST(quantity_sold - ticket_row.quantity, 0)
  WHERE id = COALESCE(
    ticket_row.ticket_option_id,
    (SELECT id FROM ticket_options
     WHERE event_id = ticket_row.event_id AND ticket_type = ticket_row.ticket_type
     ORDER BY created_at ASC LIMIT 1)
  );

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION accept_collaboration(p_collaborator_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  collab event_collaborators%ROWTYPE;
  pending_count integer;
  declined_count integer;
BEGIN
  SELECT * INTO collab FROM event_collaborators
  WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invitation introuvable'); END IF;

  UPDATE event_collaborators SET status = 'accepted' WHERE id = p_collaborator_id;
  SELECT COUNT(*) FILTER (WHERE status = 'pending'), COUNT(*) FILTER (WHERE status = 'declined')
  INTO pending_count, declined_count
  FROM event_collaborators WHERE event_id = collab.event_id;

  IF pending_count = 0 AND declined_count = 0 THEN
    UPDATE events SET status = 'published', updated_at = now() WHERE id = collab.event_id AND status = 'pending';
  ELSE
    UPDATE events SET status = 'pending', updated_at = now() WHERE id = collab.event_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION set_event_status(
  p_event_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_owner uuid;
  current_status text;
  requester_role text;
BEGIN
  SELECT organizer_user_id, status INTO event_owner, current_status FROM events WHERE id = p_event_id;
  SELECT role INTO requester_role FROM profiles WHERE id = auth.uid();
  IF event_owner IS NULL OR (event_owner <> auth.uid() AND requester_role <> 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;
  IF p_status NOT IN ('draft', 'published', 'paused', 'suspended', 'cancelled', 'completed') THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide');
  END IF;
  IF p_status = 'suspended' AND requester_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Seul un administrateur peut suspendre un événement');
  END IF;
  IF current_status IN ('cancelled', 'completed') OR
     (current_status = 'pending' AND p_status <> 'cancelled') OR
     (current_status = 'suspended' AND p_status NOT IN ('published', 'cancelled')) THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide depuis le statut actuel');
  END IF;

  UPDATE events
  SET status = p_status,
      cancellation_reason = CASE WHEN p_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
      suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE suspension_reason END,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;
GRANT EXECUTE ON FUNCTION set_event_status TO authenticated;

UPDATE events
SET status = 'completed', updated_at = now()
WHERE status IN ('published', 'paused')
  AND COALESCE(ends_at, starts_at) <= now();

UPDATE tickets SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;

UPDATE events e
SET attendees_count = COALESCE((
  SELECT SUM(t.quantity) FROM tickets t
  WHERE t.event_id = e.id AND t.status IN ('active', 'used')
), 0);
