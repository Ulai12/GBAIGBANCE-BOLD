-- Make each operator callback a guarded state transition. Row locks serialize
-- repeated callbacks and prevent inventory/count updates from being repeated.
CREATE OR REPLACE FUNCTION public.mark_refund_processing(
  p_refund_id uuid,
  p_operator_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_refund record;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, status INTO v_refund
    FROM public.ticket_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable'); END IF;
  IF v_refund.status = 'processing' THEN RETURN jsonb_build_object('success', true, 'message', 'Déjà en traitement'); END IF;
  IF v_refund.status <> 'approved' THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement non approuvé'); END IF;

  UPDATE public.ticket_refunds
     SET status = 'processing', operator_reference = p_operator_reference, updated_at = now()
   WHERE id = p_refund_id AND status = 'approved';
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_refund_done(
  p_refund_id uuid,
  p_operator_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_refund record;
  v_ticket record;
  v_payment record;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, ticket_id, payment_id, event_id, status INTO v_refund
    FROM public.ticket_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable'); END IF;
  IF v_refund.status = 'refunded' THEN RETURN jsonb_build_object('success', true, 'message', 'Déjà remboursé'); END IF;
  IF v_refund.status <> 'processing' THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement non préparé'); END IF;

  SELECT id, status INTO v_payment
    FROM public.payments WHERE id = v_refund.payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement introuvable');
  END IF;
  IF v_payment.status NOT IN ('successful', 'partially_refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non remboursable');
  END IF;

  SELECT id, ticket_option_id, status INTO v_ticket
    FROM public.tickets WHERE id = v_refund.ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable');
  END IF;
  IF v_ticket.status NOT IN ('valid', 'frozen') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet non remboursable');
  END IF;

  UPDATE public.ticket_refunds
     SET status = 'refunded', operator_reference = COALESCE(p_operator_reference, operator_reference),
         completed_at = now(), updated_at = now()
   WHERE id = p_refund_id AND status = 'processing';
  UPDATE public.tickets SET status = 'refunded', updated_at = now() WHERE id = v_refund.ticket_id;

  -- Match purchase_tickets_multi's event -> ticket_option lock order.
  UPDATE public.events SET attendees_count = GREATEST(attendees_count - 1, 0), updated_at = now()
   WHERE id = v_refund.event_id;
  IF v_ticket.ticket_option_id IS NOT NULL THEN
    UPDATE public.ticket_options SET quantity_sold = GREATEST(quantity_sold - 1, 0)
     WHERE id = v_ticket.ticket_option_id;
  END IF;

  UPDATE public.payments p
     SET status = CASE WHEN EXISTS (
           SELECT 1 FROM public.tickets t
            WHERE t.payment_id = v_refund.payment_id AND t.status <> 'refunded'
         ) THEN 'partially_refunded' ELSE 'refunded' END,
         updated_at = now()
   WHERE p.id = v_refund.payment_id;

  RETURN jsonb_build_object('success', true, 'message', 'Remboursement exécuté avec succès');
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_refund_failed(
  p_refund_id uuid,
  p_rejection_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_refund record;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, ticket_id, status INTO v_refund
    FROM public.ticket_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable'); END IF;
  IF v_refund.status = 'failed' THEN RETURN jsonb_build_object('success', true, 'message', 'Échec déjà enregistré'); END IF;
  IF v_refund.status <> 'processing' THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement non en traitement'); END IF;

  UPDATE public.ticket_refunds
     SET status = 'failed', rejection_reason = p_rejection_reason, updated_at = now()
   WHERE id = p_refund_id AND status = 'processing';
  UPDATE public.tickets SET status = 'valid', updated_at = now()
   WHERE id = v_refund.ticket_id AND status = 'frozen';
  RETURN jsonb_build_object('success', true, 'message', 'Échec enregistré et billet dégelé');
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_payments() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_pending_payments() TO service_role;
REVOKE ALL ON FUNCTION public.confirm_payment(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_refund_processing(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_processing(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_refund_done(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_done(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_refund_failed(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_refund_failed(uuid, text) TO service_role;
