/*
# GBAIGBANCE — Security Audit Remediation & Defense-in-Depth Hardening

## Overview
Remediates critical and high-priority vulnerabilities identified in the security audit:
1. RLS / Role Self-Escalation: Blocks unauthorized users from setting `role = 'admin'`.
2. Direct Ticket Minting Bypass: Removes direct INSERT/UPDATE RLS on `tickets`; restricts minting & cancellation exclusively to transactional SECURITY DEFINER RPCs (`book_ticket`, `cancel_ticket`, `validate_ticket_qr`).
3. Organization & Artist Self-Verification: Enforces database triggers preventing users from self-granting `verification_status = 'verified'` or `is_verified = true`.
4. Event Artists Authorization: Tightens `event_artists` so only event organizers and accepted collaborators can link or unlink artists.
5. Function Hijacking Prevention: Explicitly enforces `SET search_path = public` on ALL `SECURITY DEFINER` functions.
6. Like Counters & Realtime Stats: Implements atomic and secure `increment_likes_count` and `decrement_likes_count`.
7. Profile PII Protection: Creates a secure `public_profiles` view excluding email and phone numbers for directory and public searches.
*/

-- ============================================================================
-- 1. PROFILES SECURITY: Prevent Role Self-Escalation
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Prevent non-admins / non-service_role from inserting an admin role
    IF NEW.role = 'admin' THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.role := 'participant';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If role is modified, only allow if caller is service_role or an existing admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.role := OLD.role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_role();

-- Secure public view for profiles (excluding PII: phone, email)
CREATE OR REPLACE VIEW public_profiles WITH (security_invoker = true) AS
SELECT id, name, avatar_url, role, city, country, bio, created_at
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;


-- ============================================================================
-- 2. ORGANIZATIONS SECURITY: Prevent Self-Verification
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_org_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (
      auth.jwt() ->> 'role' = 'service_role' OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) THEN
      NEW.verification_status := 'pending';
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
    -- Counters cannot be directly forged by client updates
    IF NOT (auth.jwt() ->> 'role' = 'service_role') THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_verification_status ON organizations;
CREATE TRIGGER trg_protect_org_verification_status
BEFORE INSERT OR UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION protect_org_verification_status();


-- ============================================================================
-- 3. ARTISTS SECURITY: Prevent Self-Verification & Enforce Ownership
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_artist_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid();
    END IF;
    IF NOT (
      auth.jwt() ->> 'role' = 'service_role' OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) THEN
      NEW.is_verified := false;
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.is_verified := OLD.is_verified;
      END IF;
    END IF;
    IF NOT (auth.jwt() ->> 'role' = 'service_role') THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_artist_verification ON artists;
CREATE TRIGGER trg_protect_artist_verification
BEFORE INSERT OR UPDATE ON artists
FOR EACH ROW
EXECUTE FUNCTION protect_artist_verification();

-- Restrict artist insertion: authenticated users can only insert an artist linked to their own user_id
DROP POLICY IF EXISTS "artists_insert_auth" ON artists;
CREATE POLICY "artists_insert_auth" ON artists
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 4. TICKETS SECURITY: Eliminate Direct Minting & Mutation Bypass
-- ============================================================================

-- Drop direct INSERT/UPDATE/DELETE policies that allowed client-side forgery
DROP POLICY IF EXISTS "tickets_insert_own" ON tickets;
DROP POLICY IF EXISTS "tickets_update_own" ON tickets;
DROP POLICY IF EXISTS "tickets_delete_own" ON tickets;
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;

-- Only SELECT is allowed: ticket owners can view their tickets,
-- event organizers/collaborators can view tickets for check-in/management
CREATE POLICY "tickets_select_secure" ON tickets
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = tickets.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================================
-- 5. EVENT_ARTISTS SECURITY: Organizer-Only Modification
-- ============================================================================

DROP POLICY IF EXISTS "ea_insert_auth" ON event_artists;
CREATE POLICY "ea_insert_auth" ON event_artists
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_artists.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS "ea_delete_auth" ON event_artists;
CREATE POLICY "ea_delete_auth" ON event_artists
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_artists.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  )
);


-- ============================================================================
-- 6. RPC SECURITY: search_path Hardening for all SECURITY DEFINER functions
-- ============================================================================

-- Hardened sync_attendees_count
CREATE OR REPLACE FUNCTION sync_attendees_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Hardened book_ticket
CREATE OR REPLACE FUNCTION book_ticket(
  p_event_id uuid,
  p_ticket_option_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_row events%ROWTYPE;
  option_row ticket_options%ROWTYPE;
  ticket_row tickets%ROWTYPE;
  available integer;
  event_end timestamptz;
  qr text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RETURN json_build_object('success', false, 'error', 'La quantité doit être comprise entre 1 et 20');
  END IF;

  SELECT * INTO event_row FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

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
  WHERE id = p_ticket_option_id AND event_id = p_event_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Option de billet introuvable');
  END IF;

  available := option_row.quantity_total - option_row.quantity_sold;
  IF available < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Plus assez de billets disponibles');
  END IF;

  IF event_row.capacity IS NOT NULL AND event_row.attendees_count + p_quantity > event_row.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;

  qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));

  INSERT INTO tickets (
    event_id, user_id, ticket_type, ticket_option_id,
    price_paid, currency, qr_code, status, quantity
  )
  VALUES (
    p_event_id, auth.uid(), option_row.ticket_type, option_row.id,
    option_row.price * p_quantity, event_row.currency, qr, 'active', p_quantity
  )
  RETURNING * INTO ticket_row;

  UPDATE ticket_options
  SET quantity_sold = quantity_sold + p_quantity
  WHERE id = option_row.id;

  RETURN json_build_object('success', true, 'ticket', row_to_json(ticket_row));
END;
$$;

-- Hardened cancel_ticket
CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_row tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO ticket_row FROM tickets
  WHERE id = p_ticket_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  IF ticket_row.status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Billet déjà annulé ou utilisé');
  END IF;

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

-- Hardened accept_collaboration
CREATE OR REPLACE FUNCTION accept_collaboration(p_collaborator_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collab event_collaborators%ROWTYPE;
  pending_count integer;
  declined_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO collab FROM event_collaborators
  WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation introuvable');
  END IF;

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

-- Hardened set_event_status
CREATE OR REPLACE FUNCTION set_event_status(
  p_event_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_owner uuid;
  current_status text;
  requester_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

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

-- Hardened create_notification with exception swallowing
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
    VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- Atomic like count increments with search_path
CREATE OR REPLACE FUNCTION increment_likes_count(event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET likes_count = likes_count + 1 WHERE id = event_id;
$$;

CREATE OR REPLACE FUNCTION decrement_likes_count(event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = event_id;
$$;

-- Secure Ticket Check-In RPC for Event Staff / Organizers
CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_qr_code text,
  p_event_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_event events%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  -- Only event organizer, accepted collaborator, or admin may validate
  IF NOT (
    v_event.organizer_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_id = p_event_id AND user_id = auth.uid() AND status = 'accepted'
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé à valider les billets de cet événement');
  END IF;

  SELECT * INTO v_ticket FROM tickets
  WHERE qr_code = p_qr_code AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Billet invalide ou inexistant pour cet événement');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN json_build_object('success', false, 'error', 'Ce billet a déjà été validé/utilisé', 'ticket', row_to_json(v_ticket));
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Ce billet a été annulé', 'ticket', row_to_json(v_ticket));
  END IF;

  UPDATE tickets SET status = 'used' WHERE id = v_ticket.id RETURNING * INTO v_ticket;
  SELECT * INTO v_user_profile FROM profiles WHERE id = v_ticket.user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Billet validé avec succès',
    'ticket', row_to_json(v_ticket),
    'participant_name', COALESCE(v_user_profile.name, 'Participant')
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;
GRANT EXECUTE ON FUNCTION set_event_status TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_likes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ticket_qr(text, uuid) TO authenticated;
