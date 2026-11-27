-- Harden admission: only issued tickets can be checked in; persist who and when checked in.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.validate_ticket_qr(p_qr_code text, p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_participant_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'AUTH_REQUIRED', 'error', 'Authentification requise');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'EVENT_NOT_FOUND', 'error', 'Événement introuvable');
  END IF;

  IF NOT (
    v_event.organizer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.event_collaborators
      WHERE event_id = p_event_id AND user_id = auth.uid() AND status = 'accepted'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Non autorisé à valider les billets de cet événement');
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE qr_code = p_qr_code AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_TICKET', 'error', 'Billet invalide ou inexistant pour cet événement');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_USED', 'error', 'Billet déjà utilisé');
  END IF;
  IF v_ticket.status IN ('cancelled', 'refunded') THEN
    RETURN json_build_object('success', false, 'code', 'CANCELLED', 'error', 'Billet annulé ou remboursé');
  END IF;
  IF v_ticket.status = 'expired' THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'error', 'Billet expiré');
  END IF;
  IF v_ticket.status NOT IN ('valid', 'active') THEN
    RETURN json_build_object('success', false, 'code', 'NOT_ADMITTABLE', 'error', 'Billet non confirmé ou non payable');
  END IF;

  UPDATE public.tickets
  SET status = 'used', checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
  WHERE id = v_ticket.id AND status IN ('valid', 'active')
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_USED', 'error', 'Billet déjà utilisé');
  END IF;

  SELECT COALESCE(
    NULLIF(btrim(v_ticket.recipient_name), ''),
    (SELECT NULLIF(btrim(p.name), '') FROM public.profiles p WHERE p.id = v_ticket.user_id),
    'Participant'
  ) INTO v_participant_name;

  RETURN json_build_object(
    'success', true,
    'code', 'CHECKED_IN',
    'message', 'Billet validé avec succès',
    'participant_name', v_participant_name,
    'checked_in_at', v_ticket.checked_in_at,
    'ticket', json_build_object(
      'id', v_ticket.id,
      'event_id', v_ticket.event_id,
      'ticket_type', v_ticket.ticket_type,
      'seat_info', v_ticket.seat_info,
      'status', v_ticket.status,
      'checked_in_at', v_ticket.checked_in_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_ticket_qr(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_ticket_qr(text, uuid) TO authenticated, service_role;
