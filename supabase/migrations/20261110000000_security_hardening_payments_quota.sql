-- Security hardening: quota identities are derived from the verified JWT or client IP.
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(p_is_authenticated boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id text;
  v_now timestamptz := now();
  v_window integer;
  v_day integer;
  v_limit_window integer := CASE WHEN p_is_authenticated THEN 20 ELSE 5 END;
  v_limit_day integer := CASE WHEN p_is_authenticated THEN 60 ELSE 15 END;
BEGIN
  IF p_is_authenticated THEN
    v_id := 'user_' || auth.uid()::text;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authenticated identity required'; END IF;
  ELSE
    v_id := 'ip_' || COALESCE(NULLIF(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ''), 'unknown');
    v_id := split_part(v_id, ',', 1);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id, 0));
  DELETE FROM public.ai_rate_limits WHERE window_start < v_now - interval '48 hours';
  SELECT COALESCE(sum(request_count) FILTER (WHERE window_start >= v_now - interval '10 minutes'), 0)::int,
         COALESCE(sum(request_count), 0)::int INTO v_window, v_day
  FROM public.ai_rate_limits WHERE identifier = v_id AND window_start >= v_now - interval '24 hours';
  IF v_window >= v_limit_window OR v_day >= v_limit_day THEN
    RETURN json_build_object('allowed', false, 'reason', CASE WHEN v_day >= v_limit_day THEN 'daily_limit' ELSE 'window_limit' END,
      'message', CASE WHEN v_day >= v_limit_day THEN 'Plafond journalier atteint.' ELSE 'Trop de messages en peu de temps.' END);
  END IF;
  INSERT INTO public.ai_rate_limits(identifier, window_start, request_count) VALUES (v_id, v_now, 1);
  RETURN json_build_object('allowed', true, 'remaining_window', v_limit_window-v_window-1, 'remaining_daily', v_limit_day-v_day-1);
END; $$;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(boolean) TO service_role;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(text, boolean, integer, integer, integer) FROM PUBLIC, anon, authenticated;

-- Expiration must only be run by trusted scheduled/server workers.
REVOKE ALL ON FUNCTION public.expire_pending_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_payments() TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid, p_operator_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_payment record; v_role text;
BEGIN
  v_role := auth.jwt() ->> 'role';
  IF v_role IS DISTINCT FROM 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;
  SELECT id,status,event_id,quantity INTO v_payment FROM public.payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Paiement introuvable'); END IF;
  IF v_payment.status='successful' THEN RETURN jsonb_build_object('success',true,'message','Déjà validé'); END IF;
  IF v_payment.status <> 'pending' THEN RETURN jsonb_build_object('success',false,'error','État de paiement incompatible'); END IF;
  UPDATE public.payments SET status='successful',operator_reference=p_operator_reference,updated_at=now() WHERE id=p_payment_id;
  UPDATE public.tickets SET status='valid',updated_at=now() WHERE payment_id=p_payment_id AND status='pending';
  UPDATE public.events SET attendees_count=attendees_count+v_payment.quantity,updated_at=now() WHERE id=v_payment.event_id;
  RETURN jsonb_build_object('success',true,'message','Paiement confirmé et billets activés');
END; $$;

CREATE OR REPLACE FUNCTION public.mark_refund_done(p_refund_id uuid, p_operator_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_refund record; v_ticket record;
BEGIN
  IF (auth.jwt() ->> 'role') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN
    RETURN jsonb_build_object('success',false,'error','Accès réservé au service_role');
  END IF;
  SELECT id,ticket_id,event_id,status INTO v_refund FROM public.ticket_refunds WHERE id=p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Remboursement introuvable'); END IF;
  IF v_refund.status='refunded' THEN RETURN jsonb_build_object('success',true,'message','Déjà remboursé'); END IF;
  IF v_refund.status <> 'processing' THEN RETURN jsonb_build_object('success',false,'error','Remboursement non préparé'); END IF;
  SELECT id,ticket_option_id,status INTO v_ticket FROM public.tickets WHERE id=v_refund.ticket_id FOR UPDATE;
  IF v_ticket.status <> 'valid' AND v_ticket.status <> 'frozen' THEN RETURN jsonb_build_object('success',false,'error','Billet non remboursable'); END IF;
  UPDATE public.ticket_refunds SET status='refunded',operator_reference=COALESCE(p_operator_reference,operator_reference),completed_at=now(),updated_at=now() WHERE id=p_refund_id;
  UPDATE public.tickets SET status='refunded',updated_at=now() WHERE id=v_refund.ticket_id;
  IF v_ticket.ticket_option_id IS NOT NULL THEN UPDATE public.ticket_options SET quantity_sold=GREATEST(quantity_sold-1,0) WHERE id=v_ticket.ticket_option_id; END IF;
  UPDATE public.events SET attendees_count=GREATEST(attendees_count-1,0),updated_at=now() WHERE id=v_refund.event_id;
  RETURN jsonb_build_object('success',true,'message','Remboursement exécuté avec succès');
END; $$;

REVOKE ALL ON FUNCTION public.confirm_payment(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_refund_done(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_refund_done(uuid,text) TO service_role;
