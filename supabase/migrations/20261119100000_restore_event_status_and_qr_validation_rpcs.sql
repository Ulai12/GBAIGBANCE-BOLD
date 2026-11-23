-- Restore missing critical RPCs called by frontend (setEventStatus, validateTicketQr)
-- Align events status CHECK with lifecycle used in code/migrations.

-- 1. Update status constraint (no violating rows confirmed)
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'published'::text, 'paused'::text, 'suspended'::text, 'cancelled'::text, 'completed'::text, 'postponed'::text]));

-- 2. Restore set_event_status (hardened, from 20260909110000, adapted)
CREATE OR REPLACE FUNCTION public.set_event_status(
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

  IF p_status NOT IN ('draft', 'pending', 'published', 'paused', 'suspended', 'cancelled', 'completed', 'postponed') THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide');
  END IF;

  IF p_status = 'suspended' AND requester_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Seul un administrateur peut suspendre un événement');
  END IF;

  IF current_status IN ('cancelled', 'completed') OR
     (current_status = 'pending' AND p_status NOT IN ('published', 'cancelled', 'draft')) OR
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

-- 3. Restore validate_ticket_qr (secure check-in for organizers/collaborators/admins)
CREATE OR REPLACE FUNCTION public.validate_ticket_qr(
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
  v_participant_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  -- Only organizer, accepted collaborator or admin
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

  IF v_ticket.status IN ('used', 'cancelled', 'refunded', 'expired') THEN
    RETURN json_build_object('success', false, 'error', 'Billet déjà utilisé, annulé ou expiré');
  END IF;

  -- Mark as used
  UPDATE tickets SET status = 'used', updated_at = now() WHERE id = v_ticket.id;

  -- Participant name (prefer recipient_name, fallback profile)
  v_participant_name := COALESCE(
    v_ticket.recipient_name,
    (SELECT name FROM profiles WHERE id = v_ticket.user_id),
    'Participant'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Billet validé avec succès',
    'participant_name', v_participant_name,
    'ticket', row_to_json(v_ticket)
  );
END;
$$;

-- Grants: only authenticated (not anon)
REVOKE ALL ON FUNCTION public.set_event_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_event_status(uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.validate_ticket_qr(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_ticket_qr(text, uuid) TO authenticated, service_role;
