-- 20261125121822_restrict_payment_confirmation_to_signed_webhook.sql
CREATE OR REPLACE FUNCTION public.confirm_ticket_payment(
  p_payment_id uuid,
  p_provider_ref text DEFAULT NULL,
  p_provider text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_option ticket_options%ROWTYPE;
  v_event events%ROWTYPE;
  v_i integer;
  v_qr text;
  v_ticket_ids uuid[] := ARRAY[]::uuid[];
  v_ticket_id uuid;
  v_type text;
  v_unit integer;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Paiement introuvable'); END IF;
  IF v_payment.status = 'succeeded' THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_ticket_ids
    FROM public.tickets WHERE payment_id = v_payment.id;
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'payment_id', v_payment.id, 'status', 'succeeded', 'ticket_ids', to_jsonb(v_ticket_ids));
  END IF;
  IF v_payment.status NOT IN ('pending', 'initiated') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Statut de paiement non confirmable: ' || v_payment.status);
  END IF;
  SELECT * INTO v_option FROM public.ticket_options WHERE id = v_payment.ticket_option_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Option de billet introuvable'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = v_payment.event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Evenement introuvable'); END IF;
  IF (v_option.quantity_total - v_option.quantity_sold) < v_payment.quantity THEN
    UPDATE public.payments SET status = 'failed', updated_at = now(),
      metadata = metadata || jsonb_build_object('fail_reason', 'stock_exhausted_at_confirm')
    WHERE id = v_payment.id;
    RETURN jsonb_build_object('success', false, 'error', 'Stock epuise au moment de la confirmation');
  END IF;
  IF v_event.capacity IS NOT NULL AND v_event.attendees_count + v_payment.quantity > v_event.capacity THEN
    UPDATE public.payments SET status = 'failed', updated_at = now(),
      metadata = metadata || jsonb_build_object('fail_reason', 'capacity_at_confirm')
    WHERE id = v_payment.id;
    RETURN jsonb_build_object('success', false, 'error', 'Capacite atteinte au moment de la confirmation');
  END IF;
  v_type := COALESCE(v_option.ticket_type, 'standard');
  v_unit := CASE WHEN v_payment.quantity > 0 THEN (v_payment.amount_face_xof / v_payment.quantity) ELSE 0 END;
  FOR v_i IN 1..v_payment.quantity LOOP
    v_qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
    INSERT INTO public.tickets (
      event_id, user_id, ticket_type, price_paid, currency, qr_code, status,
      payment_id, ticket_option_id, quantity, platform_fee_xof, organizer_net_xof, fee_payer, is_for_me
    ) VALUES (
      v_payment.event_id, v_payment.buyer_user_id, v_type, v_unit, 'XOF', v_qr, 'valid',
      v_payment.id, v_payment.ticket_option_id, 1,
      CASE WHEN v_payment.quantity > 0 THEN v_payment.platform_fee_xof / v_payment.quantity ELSE 0 END,
      CASE WHEN v_payment.quantity > 0 THEN v_payment.organizer_payout_xof / v_payment.quantity ELSE 0 END,
      v_payment.fee_payer, true
    ) RETURNING id INTO v_ticket_id;
    v_ticket_ids := array_append(v_ticket_ids, v_ticket_id);
  END LOOP;
  UPDATE public.ticket_options SET quantity_sold = quantity_sold + v_payment.quantity WHERE id = v_payment.ticket_option_id;
  UPDATE public.events SET attendees_count = attendees_count + v_payment.quantity WHERE id = v_payment.event_id;
  UPDATE public.payments SET status = 'succeeded',
    provider = COALESCE(NULLIF(p_provider, ''), provider),
    provider_ref = COALESCE(p_provider_ref, provider_ref),
    confirmed_at = now(), updated_at = now()
  WHERE id = v_payment.id;
  RETURN jsonb_build_object('success', true, 'payment_id', v_payment.id, 'status', 'succeeded', 'ticket_ids', to_jsonb(v_ticket_ids), 'quantity', v_payment.quantity);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_ticket_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_ticket_payment(uuid, text, text) TO service_role;
