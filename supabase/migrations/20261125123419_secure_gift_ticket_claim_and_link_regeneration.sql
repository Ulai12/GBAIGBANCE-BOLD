-- 20261125123419_secure_gift_ticket_claim_and_link_regeneration.sql
CREATE OR REPLACE FUNCTION public.claim_ticket_by_token(p_raw_claim_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentification requise'); END IF;
  IF p_raw_claim_token IS NULL OR length(trim(p_raw_claim_token)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;
  SELECT * INTO v_ticket FROM public.tickets
  WHERE claim_token = trim(p_raw_claim_token) AND COALESCE(is_claimed, false) = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien de réclamation invalide ou déjà utilisé');
  END IF;
  IF COALESCE(v_ticket.is_for_me, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet n’est pas transférable par lien');
  END IF;
  IF v_ticket.status NOT IN ('valid', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet n’est plus réclamable');
  END IF;
  IF v_ticket.user_id IS NOT NULL
     AND v_ticket.user_id IS DISTINCT FROM v_ticket.buyer_user_id
     AND v_ticket.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet est déjà attribué à un autre compte');
  END IF;
  IF v_ticket.claim_token_expires_at IS NOT NULL AND v_ticket.claim_token_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien expiré');
  END IF;
  UPDATE public.tickets
  SET user_id = v_uid, is_claimed = true, claimed_at = now(), claim_token = NULL
  WHERE id = v_ticket.id;
  RETURN jsonb_build_object('success', true, 'message', 'Billet réclamé avec succès', 'ticket_id', v_ticket.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_claim_link(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.tickets%ROWTYPE;
  v_token text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentification requise'); END IF;
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable'); END IF;
  IF v_ticket.buyer_user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul l’acheteur peut renouveler ce lien');
  END IF;
  IF COALESCE(v_ticket.is_for_me, true) OR COALESCE(v_ticket.is_claimed, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet n’est pas un cadeau disponible à réclamer');
  END IF;
  IF v_ticket.status NOT IN ('valid', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet ne peut plus être transféré');
  END IF;
  v_token := encode(extensions.gen_random_bytes(12), 'hex');
  UPDATE public.tickets
  SET claim_token = v_token, claimed_at = NULL,
      claim_token_expires_at = now() + interval '30 days'
  WHERE id = p_ticket_id;
  RETURN jsonb_build_object('success', true, 'claim_token', v_token);
END;
$$;
