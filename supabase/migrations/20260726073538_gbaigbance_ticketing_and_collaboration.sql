/*
# Gbaigbance — Billetterie opérationnelle et collaboration artistes-organisateurs

## Description
Rend la réservation de billets opérationnelle et permet aux artistes de créer des événements et de collaborer.

## Changements
1. Table `ticket_options` — options de billets par événement
2. Table `event_collaborators` — collaboration entre utilisateurs
3. RPC `book_ticket` — réservation transactionnelle avec QR code
4. RPC `cancel_ticket` — annulation de billet
5. Colonne `events.created_by_role`
6. RLS mise à jour pour artistes + collaborateurs
*/

-- ==================== TICKET_OPTIONS ====================
CREATE TABLE IF NOT EXISTS ticket_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type text NOT NULL DEFAULT 'standard' CHECK (ticket_type IN ('free','standard','vip','vvip')),
  label text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity_total integer NOT NULL DEFAULT 100,
  quantity_sold integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_options_event_idx ON ticket_options(event_id);
ALTER TABLE ticket_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_options_select" ON ticket_options;
CREATE POLICY "ticket_options_select" ON ticket_options FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND (events.status = 'published' OR events.organizer_user_id = auth.uid())));
DROP POLICY IF EXISTS "ticket_options_insert_own" ON ticket_options;
CREATE POLICY "ticket_options_insert_own" ON ticket_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_options_update_own" ON ticket_options;
CREATE POLICY "ticket_options_update_own" ON ticket_options FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_options_delete_own" ON ticket_options;
CREATE POLICY "ticket_options_delete_own" ON ticket_options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));

-- ==================== EVENT_COLLABORATORS ====================
CREATE TABLE IF NOT EXISTS event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'performer' CHECK (role IN ('co_organizer', 'performer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_collaborators_event_idx ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS event_collaborators_user_idx ON event_collaborators(user_id);
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_select" ON event_collaborators;
CREATE POLICY "collab_select" ON event_collaborators FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()) OR event_collaborators.user_id = auth.uid());
DROP POLICY IF EXISTS "collab_insert_own" ON event_collaborators;
CREATE POLICY "collab_insert_own" ON event_collaborators FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "collab_update_own" ON event_collaborators;
CREATE POLICY "collab_update_own" ON event_collaborators FOR UPDATE TO authenticated USING (event_collaborators.user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (event_collaborators.user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "collab_delete_own" ON event_collaborators;
CREATE POLICY "collab_delete_own" ON event_collaborators FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()) OR event_collaborators.user_id = auth.uid());

-- ==================== EVENTS: colonne created_by_role ====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by_role') THEN
    ALTER TABLE events ADD COLUMN created_by_role text DEFAULT 'organizer' CHECK (created_by_role IN ('organizer', 'artist'));
  END IF;
END $$;

-- ==================== EVENTS: update policy pour collaborateurs ====================
DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = organizer_user_id OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_collaborators.event_id = events.id AND event_collaborators.user_id = auth.uid() AND event_collaborators.status = 'accepted')) WITH CHECK (auth.uid() = organizer_user_id OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_collaborators.event_id = events.id AND event_collaborators.user_id = auth.uid() AND event_collaborators.status = 'accepted'));

-- ==================== RPC: book_ticket ====================
CREATE OR REPLACE FUNCTION book_ticket(p_event_id uuid, p_ticket_option_id uuid, p_quantity integer DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_event events%ROWTYPE; v_option ticket_options%ROWTYPE; v_ticket tickets%ROWTYPE; v_available integer; v_qr text;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Événement introuvable'); END IF;
  IF v_event.status != 'published' THEN RETURN json_build_object('error', 'Événement non disponible'); END IF;
  SELECT * INTO v_option FROM ticket_options WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Option de billet introuvable'); END IF;
  v_available := v_option.quantity_total - v_option.quantity_sold;
  IF v_available < p_quantity THEN RETURN json_build_object('error', 'Plus assez de billets disponibles'); END IF;
  IF v_event.capacity IS NOT NULL AND v_event.attendees_count + p_quantity > v_event.capacity THEN RETURN json_build_object('error', 'Capacité maximale atteinte'); END IF;
  v_qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO tickets (event_id, user_id, ticket_type, price_paid, currency, qr_code, status) VALUES (p_event_id, auth.uid(), v_option.ticket_type, v_option.price * p_quantity, v_event.currency, v_qr, 'active') RETURNING * INTO v_ticket;
  UPDATE ticket_options SET quantity_sold = quantity_sold + p_quantity WHERE id = p_ticket_option_id;
  UPDATE events SET attendees_count = attendees_count + p_quantity WHERE id = p_event_id;
  RETURN json_build_object('success', true, 'ticket', row_to_json(v_ticket));
END;
$$;

-- ==================== RPC: cancel_ticket ====================
CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ticket tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Billet introuvable'); END IF;
  IF v_ticket.status != 'active' THEN RETURN json_build_object('error', 'Billet déjà annulé ou utilisé'); END IF;
  UPDATE tickets SET status = 'cancelled' WHERE id = p_ticket_id;
  UPDATE ticket_options SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE event_id = v_ticket.event_id AND ticket_type = v_ticket.ticket_type;
  UPDATE events SET attendees_count = GREATEST(attendees_count - 1, 0) WHERE id = v_ticket.event_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;
