-- 20261125122943_harden_ticket_booking_and_presence_challenge.sql
CREATE TABLE IF NOT EXISTS public.ticket_presence_challenges (
  ticket_id uuid PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
  secret_seed uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_presence_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_presence_challenges FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ticket_presence_challenges FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_ticket_presence_challenge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ticket_presence_challenges(ticket_id)
  VALUES (NEW.id) ON CONFLICT (ticket_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_ticket_presence_challenge() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_create_ticket_presence_challenge ON public.tickets;
CREATE TRIGGER trg_create_ticket_presence_challenge
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.create_ticket_presence_challenge();

INSERT INTO public.ticket_presence_challenges(ticket_id)
SELECT t.id FROM public.tickets t
ON CONFLICT (ticket_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.book_ticket(
  p_event_id uuid, p_ticket_option_id uuid, p_quantity integer DEFAULT 1
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_option public.ticket_options%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;
  v_available integer;
  v_quantity integer;
  v_qr text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('success', false, 'error', 'Authentification requise'); END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Quantité invalide (1 à 10 billets maximum)');
  END IF;
  v_quantity := p_quantity;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status IS DISTINCT FROM 'published' THEN
    RETURN json_build_object('success', false, 'error', 'Événement non disponible');
  END IF;
  IF COALESCE(v_event.access_type, 'tickets') = 'external' THEN
    RETURN json_build_object('success', false, 'error', 'Billetterie externe', 'code', 'EXTERNAL_TICKETING', 'external_ticket_url', v_event.external_ticket_url);
  END IF;
  IF COALESCE(v_event.access_type, 'tickets') = 'whatsapp' THEN
    RETURN json_build_object('success', false, 'error', 'Réservation WhatsApp', 'code', 'WHATSAPP_TICKETING');
  END IF;
  SELECT * INTO v_option FROM public.ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Option de billet introuvable'); END IF;
  IF COALESCE(v_option.is_active, true) IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Cette option de billet est désactivée');
  END IF;
  IF v_option.sales_start_at IS NOT NULL AND now() < v_option.sales_start_at THEN
    RETURN json_build_object('success', false, 'error', 'La vente n’a pas encore commencé');
  END IF;
  IF v_option.sales_end_at IS NOT NULL AND now() > v_option.sales_end_at THEN
    RETURN json_build_object('success', false, 'error', 'La vente est terminée');
  END IF;
  IF COALESCE(v_option.price, 0) <> 0 THEN
    RETURN json_build_object('success', false, 'error', 'Un billet payant doit passer par le paiement Mobile Money', 'code', 'USE_INITIATE_PAYMENT');
  END IF;
  v_available := COALESCE(v_option.quantity_total, 0) - COALESCE(v_option.quantity_sold, 0);
  IF v_available < v_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Plus assez de billets disponibles');
  END IF;
  IF v_event.capacity IS NOT NULL AND COALESCE(v_event.attendees_count, 0) + v_quantity > v_event.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;
  v_qr := 'GBC-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO public.tickets (
    event_id, user_id, ticket_type, price_paid, currency, qr_code, status,
    ticket_option_id, quantity, is_for_me
  ) VALUES (
    p_event_id, auth.uid(), COALESCE(v_option.ticket_type, 'free'), 0,
    COALESCE(v_event.currency, 'XOF'), v_qr, 'valid',
    p_ticket_option_id, v_quantity, true
  ) RETURNING * INTO v_ticket;
  UPDATE public.ticket_options SET quantity_sold = COALESCE(quantity_sold, 0) + v_quantity WHERE id = p_ticket_option_id;
  UPDATE public.events SET attendees_count = COALESCE(attendees_count, 0) + v_quantity WHERE id = p_event_id;
  RETURN json_build_object('success', true, 'ticket', row_to_json(v_ticket));
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_tickets_multi(
  p_event_id uuid, p_ticket_option_id uuid, p_recipients jsonb,
  p_payment_provider text DEFAULT 'free', p_payment_phone text DEFAULT NULL, p_buyer_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.events%ROWTYPE;
  v_option public.ticket_options%ROWTYPE;
  v_qty integer;
  v_rec jsonb;
  v_i integer;
  v_qr text;
  v_token text;
  v_ticket_id uuid;
  v_tickets jsonb := '[]'::jsonb;
  v_is_for_me boolean;
  v_name text;
  v_phone text;
  v_recipient_uid uuid;
  v_target_uid uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentification requise'); END IF;
  IF p_recipients IS NULL OR jsonb_typeof(p_recipients) <> 'array' OR jsonb_array_length(p_recipients) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun bénéficiaire');
  END IF;
  v_qty := jsonb_array_length(p_recipients);
  IF v_qty > 10 THEN RETURN jsonb_build_object('success', false, 'error', 'Maximum 10 billets'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Événement non disponible');
  END IF;
  IF COALESCE(v_event.access_type, 'tickets') IN ('external', 'whatsapp') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Canal de vente non interne', 'code', upper(v_event.access_type));
  END IF;
  SELECT * INTO v_option FROM public.ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Option introuvable'); END IF;
  IF COALESCE(v_option.is_active, true) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette option de billet est désactivée');
  END IF;
  IF v_option.sales_start_at IS NOT NULL AND now() < v_option.sales_start_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La vente n’a pas encore commencé');
  END IF;
  IF v_option.sales_end_at IS NOT NULL AND now() > v_option.sales_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La vente est terminée');
  END IF;
  IF COALESCE(v_option.price, 0) < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prix du billet invalide');
  END IF;
  IF COALESCE(v_option.price, 0) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utilisez initiate_ticket_payment pour les billets payants', 'code', 'USE_INITIATE_PAYMENT');
  END IF;
  IF COALESCE(v_option.quantity_total, 0) - COALESCE(v_option.quantity_sold, 0) < v_qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuffisant');
  END IF;
  IF v_event.capacity IS NOT NULL AND COALESCE(v_event.attendees_count, 0) + v_qty > v_event.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacité atteinte');
  END IF;
  FOR v_i IN 0..v_qty - 1 LOOP
    v_rec := p_recipients->v_i;
    v_is_for_me := COALESCE((v_rec->>'is_for_me')::boolean, v_i = 0);
    v_name := COALESCE(NULLIF(trim(v_rec->>'recipient_name'), ''), CASE WHEN v_is_for_me THEN 'Moi-même' ELSE 'Invité' END);
    v_phone := NULLIF(trim(v_rec->>'recipient_phone'), '');
    BEGIN
      v_recipient_uid := NULLIF(v_rec->>'recipient_user_id', '')::uuid;
    EXCEPTION WHEN others THEN
      v_recipient_uid := NULL;
    END;
    v_target_uid := CASE WHEN v_is_for_me THEN v_uid WHEN v_recipient_uid IS NOT NULL THEN v_recipient_uid ELSE v_uid END;
    v_qr := 'GBC-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
    v_token := CASE WHEN v_is_for_me THEN NULL ELSE encode(extensions.gen_random_bytes(12), 'hex') END;
    INSERT INTO public.tickets (
      event_id, user_id, buyer_user_id, buyer_name, ticket_type, price_paid, currency,
      qr_code, status, ticket_option_id, quantity, is_for_me, recipient_name, recipient_phone,
      claim_token, is_claimed, claim_token_expires_at
    ) VALUES (
      p_event_id, v_target_uid, v_uid, p_buyer_name, COALESCE(v_option.ticket_type, 'free'),
      0, 'XOF', v_qr, 'valid', p_ticket_option_id, 1, v_is_for_me, v_name, v_phone,
      v_token, v_is_for_me, CASE WHEN v_token IS NOT NULL THEN now() + interval '30 days' ELSE NULL END
    ) RETURNING id INTO v_ticket_id;
    v_tickets := v_tickets || jsonb_build_array(jsonb_build_object(
      'ticket_id', v_ticket_id, 'qr_code', v_qr, 'is_for_me', v_is_for_me,
      'recipient_name', v_name, 'claim_token', v_token
    ));
  END LOOP;
  UPDATE public.ticket_options SET quantity_sold = COALESCE(quantity_sold, 0) + v_qty WHERE id = p_ticket_option_id;
  UPDATE public.events SET attendees_count = COALESCE(attendees_count, 0) + v_qty WHERE id = p_event_id;
  RETURN jsonb_build_object('success', true, 'amount_xof', 0, 'tickets', v_tickets);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_presence_challenge(
  p_ticket_id uuid, p_submitted_pattern text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.tickets%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_seed uuid;
  v_digest bytea;
  v_expected_pattern text;
  v_attempts integer;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentification requise'); END IF;
  IF p_ticket_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Billet invalide'); END IF;
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable'); END IF;
  IF v_ticket.user_id IS DISTINCT FROM v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'Non autorisé'); END IF;
  IF v_ticket.status NOT IN ('valid', 'used') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet non valide pour ce défi');
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_presence_badges b WHERE b.ticket_id = p_ticket_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Badge déjà obtenu', 'badge_name', 'Pionnier du Live');
  END IF;
  v_attempts := COALESCE(v_ticket.challenge_attempts, 0);
  IF v_attempts >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nombre maximal de tentatives atteint', 'attempts_left', 0);
  END IF;
  SELECT * INTO v_event FROM public.events WHERE id = v_ticket.event_id;
  IF NOT FOUND OR v_event.starts_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Date de début indéterminée');
  END IF;
  IF now() < v_event.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le défi sera déverrouillé à l’heure de début de l’événement');
  END IF;
  IF now() > v_event.starts_at + interval '15 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La fenêtre de présence de 15 minutes est refermée');
  END IF;
  SELECT secret_seed INTO v_seed FROM public.ticket_presence_challenges WHERE ticket_id = p_ticket_id;
  IF v_seed IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Défi indisponible pour ce billet'); END IF;
  v_digest := extensions.digest(v_event.id::text || v_seed::text, 'sha256');
  SELECT string_agg(node::text, '-' ORDER BY get_byte(v_digest, node - 1), node)
  INTO v_expected_pattern FROM generate_series(1, 4) AS node;
  IF p_submitted_pattern IS NULL OR trim(p_submitted_pattern) <> v_expected_pattern THEN
    UPDATE public.tickets SET challenge_attempts = v_attempts + 1, updated_at = now() WHERE id = p_ticket_id;
    RETURN jsonb_build_object('success', false, 'error', 'Motif incorrect', 'attempts_left', GREATEST(3 - (v_attempts + 1), 0));
  END IF;
  INSERT INTO public.event_presence_badges (
    event_id, user_id, ticket_id, challenge_type, badge_name, badge_icon, is_public_on_profile
  ) VALUES (v_event.id, v_uid, p_ticket_id, 'rhythm_pattern', 'Pionnier du Live', 'flame', false)
  ON CONFLICT (ticket_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'badge_name', 'Pionnier du Live', 'badge_icon', 'flame', 'message', 'Défi validé. Badge Pionnier du Live débloqué.');
END;
$$;
