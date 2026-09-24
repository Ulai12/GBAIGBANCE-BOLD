/*
# GBAIGBANCE — Billetterie Apple Wallet, Achat Multi-bénéficiaires, Cycles d'Événements, Remboursements Mobile Money & Défi de Présence

## Description
Migration complète, durcie et transactionnelle :
1. Normalisation sans perte des statuts 'events' et 'tickets' (SELECT DISTINCT mapping pré-contraintes).
2. Ajout de postponed_to, postponement_deadline sur events.
3. Table payments (XOF entier, stock réservé 15 min, traçabilité opérateur Flooz/T-Money/MTN).
4. Table tickets étendue (buyer_user_id, payment_id, claim_token_hash sha256 à usage unique, presence_challenge_seed masqué, challenge_attempts).
5. Table ticket_refunds (montant entier XOF strict dérivé de tickets.price_paid, 1 remboursement actif par ticket).
6. Table event_presence_badges (is_public_on_profile false par défaut, aucun SELECT anonyme, ON CONFLICT DO NOTHING).
7. Fonctions RPC sécurisées (search_path = '', auth.uid(), REVOKE ALL FROM PUBLIC/anon, GRANT TO authenticated) :
   - purchase_tickets_multi
   - regenerate_claim_link
   - claim_ticket_by_token
   - request_ticket_refund
   - review_refund (organisateur)
   - complete_presence_challenge (anti-triche, max 3 essais, fenêtre starts_at -> starts_at + 15 min, aucun hint divulgué)
   - expire_pending_payments (déblocage automatique du stock)
   - Fonctions service_role pour l'agrégateur : confirm_payment, mark_refund_processing, mark_refund_done, mark_refund_failed.
*/

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- 2. NORMALISATION ET EXTENSION DE LA TABLE EVENTS
-- ============================================================================

-- Normalisation sécurisée des statuts existants avant application de la contrainte
UPDATE public.events
SET status = 'published'
WHERE status IS NULL OR status NOT IN ('draft', 'pending', 'published', 'paused', 'suspended', 'cancelled', 'completed', 'postponed');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_status_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE public.events 
  ADD CONSTRAINT events_status_check 
  CHECK (status IN ('draft', 'pending', 'published', 'paused', 'suspended', 'cancelled', 'completed', 'postponed'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS postponed_to timestamptz,
  ADD COLUMN IF NOT EXISTS postponement_deadline timestamptz;

-- ============================================================================
-- 3. TABLE PAYMENTS (Réservations, stock et traçabilité Mobile Money)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ticket_option_id uuid NOT NULL REFERENCES public.ticket_options(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  amount_xof integer NOT NULL CHECK (amount_xof >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  payment_provider text NOT NULL CHECK (payment_provider IN ('tmoney', 'flooz', 'mtn')),
  payment_phone text NOT NULL,
  operator_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'expired', 'refunded', 'partially_refunded')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_buyer ON public.payments(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_event ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_expires ON public.payments(status, expires_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select_authorized" ON public.payments;
CREATE POLICY "payments_select_authorized" ON public.payments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = buyer_user_id 
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = payments.event_id AND e.organizer_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================================
-- 4. NORMALISATION ET EXTENSION DE LA TABLE TICKETS
-- ============================================================================

-- Normalisation sécurisée des statuts historiques ('active' -> 'valid')
UPDATE public.tickets
SET status = 'valid'
WHERE status = 'active';

UPDATE public.tickets
SET status = 'refunded'
WHERE status = 'cancelled';

UPDATE public.tickets
SET status = 'valid'
WHERE status NOT IN ('pending', 'valid', 'used', 'frozen', 'refunded', 'expired');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tickets_status_check' AND table_name = 'tickets'
  ) THEN
    ALTER TABLE public.tickets DROP CONSTRAINT tickets_status_check;
  END IF;
END $$;

ALTER TABLE public.tickets 
  ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('pending', 'valid', 'used', 'frozen', 'refunded', 'expired'));

ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS claim_token_hash text UNIQUE,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS postponed_decision text DEFAULT 'pending' 
    CHECK (postponed_decision IN ('pending', 'keep', 'refund_requested')),
  -- Graine secrète pour le défi horaire (non lisible côté client via la vue sécurisée)
  ADD COLUMN IF NOT EXISTS presence_challenge_seed text,
  ADD COLUMN IF NOT EXISTS challenge_attempts integer NOT NULL DEFAULT 0;

-- Remplissage initial pour cohérence rétroactive des données
UPDATE public.tickets 
SET buyer_user_id = user_id 
WHERE buyer_user_id IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_claim_token_hash ON public.tickets(claim_token_hash) WHERE claim_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_payment_id ON public.tickets(payment_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_user_id ON public.tickets(buyer_user_id);

-- RLS Tickets : lecture exclusive pour le détenteur, l'acheteur ou l'organisateur (aucun INSERT/UPDATE direct)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_secure" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_authorized" ON public.tickets;
CREATE POLICY "tickets_select_authorized" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR auth.uid() = buyer_user_id 
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = tickets.event_id
      AND (
        e.organizer_user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.event_collaborators ec
          WHERE ec.event_id = e.id AND ec.user_id = auth.uid() AND ec.status = 'accepted'
        )
      )
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Vue publique sécurisée des tickets masquant presence_challenge_seed et claim_token_hash
CREATE OR REPLACE VIEW public.tickets_view WITH (security_invoker = true) AS
SELECT 
  id, event_id, user_id, buyer_user_id, payment_id, ticket_type, ticket_option_id,
  price_paid, currency, qr_code, status, quantity, seat_info,
  recipient_name, recipient_phone, recipient_email, is_claimed, claimed_at,
  claim_token_expires_at, postponed_decision, challenge_attempts, created_at
FROM public.tickets;

GRANT SELECT ON public.tickets_view TO authenticated;

-- ============================================================================
-- 5. TABLE TICKET_REFUNDS (Calcul serveur strict, pas de doublon flooz/moov)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested' 
    CHECK (status IN ('requested', 'under_review', 'approved', 'rejected', 'processing', 'refunded', 'failed')),
  reason_type text NOT NULL 
    CHECK (reason_type IN ('cancellation', 'postponement', 'customer_request')),
  reason_details text,
  rejection_reason text,
  amount_xof integer NOT NULL CHECK (amount_xof >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  payment_provider text NOT NULL CHECK (payment_provider IN ('tmoney', 'flooz', 'mtn')),
  refund_phone text NOT NULL,
  operator_reference text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index unique partiel : UN SEUL remboursement actif par ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_refunds_single_active 
  ON public.ticket_refunds(ticket_id) 
  WHERE status NOT IN ('rejected', 'failed');

CREATE INDEX IF NOT EXISTS idx_ticket_refunds_event_id ON public.ticket_refunds(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_refunds_requester ON public.ticket_refunds(requester_user_id);

ALTER TABLE public.ticket_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_refunds_select_authorized" ON public.ticket_refunds;
CREATE POLICY "ticket_refunds_select_authorized" ON public.ticket_refunds
  FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_user_id 
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_refunds.event_id AND e.organizer_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================================
-- 6. TABLE EVENT_PRESENCE_BADGES (Opt-in false par défaut, authentifiés uniquement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_presence_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  challenge_type text NOT NULL DEFAULT 'rhythm_pattern',
  is_public_on_profile boolean NOT NULL DEFAULT false, -- Opt-in désactivé par défaut
  server_timestamp timestamptz NOT NULL DEFAULT now(),
  badge_name text NOT NULL DEFAULT 'Pionnier du Live',
  badge_icon text NOT NULL DEFAULT 'flame',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_presence_badges_user ON public.event_presence_badges(user_id);

ALTER TABLE public.event_presence_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presence_badges_select_authorized" ON public.event_presence_badges;
CREATE POLICY "presence_badges_select_authorized" ON public.event_presence_badges
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_public_on_profile = true
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_presence_badges.event_id AND e.organizer_user_id = auth.uid())
  );

-- ============================================================================
-- 7. FONCTIONS RPC SÉCURISÉES (search_path = '', auth.uid(), REVOKE PUBLIC/anon)
-- ============================================================================

-------------------------------------------------------------------------------
-- RPC 1 : purchase_tickets_multi
-- Limite à 3 paiements pending max par utilisateur, réserve le stock,
-- utilise encode() natif et extensions.gen_random_bytes / extensions.digest.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_tickets_multi(
  p_event_id uuid,
  p_ticket_option_id uuid,
  p_recipients jsonb,
  p_payment_provider text,
  p_payment_phone text
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_pending_count integer;
  v_event record;
  v_option record;
  v_qty integer;
  v_total_amount_xof integer;
  v_unit_price integer;
  v_available integer;
  v_payment_id uuid;
  v_recipient jsonb;
  v_qr_code text;
  v_raw_token text;
  v_token_hash text;
  v_recipient_name text;
  v_recipient_phone text;
  v_is_for_me boolean;
  v_ticket_id uuid;
  v_assigned_user_id uuid;
  v_created_tickets jsonb := '[]'::jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  -- Limite anti-accaparement : max 3 paiements pending simultanés non expirés
  SELECT COUNT(*) INTO v_pending_count
  FROM public.payments
  WHERE buyer_user_id = v_caller_id AND status = 'pending' AND expires_at > now();

  IF v_pending_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà 3 commandes en attente de paiement. Veuillez les finaliser ou patienter 15 minutes.');
  END IF;

  IF p_recipients IS NULL OR jsonb_typeof(p_recipients) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liste des bénéficiaires invalide');
  END IF;

  v_qty := jsonb_array_length(p_recipients);
  IF v_qty < 1 OR v_qty > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La commande doit comporter entre 1 et 20 billets');
  END IF;

  IF p_payment_provider NOT IN ('tmoney', 'flooz', 'mtn') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opérateur Mobile Money non supporté');
  END IF;

  IF p_payment_phone IS NULL OR length(trim(p_payment_phone)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Numéro de téléphone Mobile Money invalide');
  END IF;

  -- Verrouillage de l'événement
  SELECT id, status, sales_start_at, sales_end_at, ends_at, starts_at, capacity, attendees_count, currency
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  IF v_event.status <> 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La billetterie n''est pas ouverte pour cet événement');
  END IF;

  IF v_event.sales_start_at IS NOT NULL AND now() < v_event.sales_start_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La vente n''a pas encore commencé');
  END IF;

  IF v_event.sales_end_at IS NOT NULL AND now() >= v_event.sales_end_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'La période de vente est clôturée');
  END IF;

  IF COALESCE(v_event.ends_at, v_event.starts_at) <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cet événement est terminé');
  END IF;

  -- Verrouillage de l'option de billet
  SELECT id, ticket_type, price, quantity_total, quantity_sold
  INTO v_option
  FROM public.ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Option de billet introuvable');
  END IF;

  v_available := v_option.quantity_total - v_option.quantity_sold;
  IF v_available < v_qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuffisant pour cette catégorie');
  END IF;

  IF v_event.capacity IS NOT NULL AND (v_event.attendees_count + v_qty) > v_event.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;

  v_unit_price := ROUND(v_option.price)::integer;
  v_total_amount_xof := v_unit_price * v_qty;

  -- Réservation du stock
  UPDATE public.ticket_options
  SET quantity_sold = quantity_sold + v_qty
  WHERE id = v_option.id;

  INSERT INTO public.payments (
    event_id,
    buyer_user_id,
    ticket_option_id,
    quantity,
    amount_xof,
    currency,
    payment_provider,
    payment_phone,
    status,
    expires_at
  ) VALUES (
    p_event_id,
    v_caller_id,
    v_option.id,
    v_qty,
    v_total_amount_xof,
    'XOF',
    p_payment_provider,
    trim(p_payment_phone),
    'pending',
    now() + interval '15 minutes'
  ) RETURNING id INTO v_payment_id;

  FOR i IN 0..(v_qty - 1) LOOP
    v_recipient := p_recipients->i;
    v_recipient_name := NULLIF(trim(COALESCE((v_recipient->>'recipient_name'), '')), '');
    v_recipient_phone := NULLIF(trim(COALESCE((v_recipient->>'recipient_phone'), '')), '');
    v_is_for_me := COALESCE((v_recipient->>'is_for_me')::boolean, (i = 0));

    -- encode natif Postgres + extensions.gen_random_bytes
    v_qr_code := 'GBC-' || upper(encode(extensions.gen_random_bytes(10), 'hex'));

    IF v_is_for_me THEN
      v_assigned_user_id := v_caller_id;
      v_raw_token := NULL;
      v_token_hash := NULL;
    ELSE
      v_assigned_user_id := NULL;
      v_raw_token := lower(encode(extensions.gen_random_bytes(16), 'hex'));
      v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
    END IF;

    INSERT INTO public.tickets (
      event_id,
      ticket_option_id,
      payment_id,
      buyer_user_id,
      user_id,
      ticket_type,
      price_paid,
      currency,
      quantity,
      qr_code,
      status,
      recipient_name,
      recipient_phone,
      claim_token_hash,
      claim_token_expires_at,
      is_claimed,
      presence_challenge_seed,
      challenge_attempts
    ) VALUES (
      p_event_id,
      v_option.id,
      v_payment_id,
      v_caller_id,
      v_assigned_user_id,
      v_option.ticket_type,
      v_unit_price,
      'XOF',
      1,
      v_qr_code,
      'pending',
      v_recipient_name,
      v_recipient_phone,
      v_token_hash,
      CASE WHEN v_token_hash IS NOT NULL THEN (now() + interval '30 days') ELSE NULL END,
      v_is_for_me,
      lower(encode(extensions.gen_random_bytes(8), 'hex')),
      0
    ) RETURNING id INTO v_ticket_id;

    v_created_tickets := v_created_tickets || jsonb_build_object(
      'ticket_id', v_ticket_id,
      'qr_code', v_qr_code,
      'is_for_me', v_is_for_me,
      'recipient_name', v_recipient_name,
      'claim_token', v_raw_token
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_xof', v_total_amount_xof,
    'currency', 'XOF',
    'status', 'pending',
    'expires_at', (now() + interval '15 minutes'),
    'tickets', v_created_tickets
  );
END;
$$;

-------------------------------------------------------------------------------
-- RPC 2 : regenerate_claim_link
-- Permet à l'acheteur d'un billet non réclamé de régénérer un lien pour son ami
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_claim_link(
  p_ticket_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_ticket record;
  v_raw_token text;
  v_token_hash text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT id, buyer_user_id, user_id, is_claimed, status
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  IF v_ticket.buyer_user_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul l''acheteur initial peut régénérer le lien');
  END IF;

  IF v_ticket.is_claimed OR v_ticket.user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet a déjà été réclamé par le bénéficiaire');
  END IF;

  IF v_ticket.status NOT IN ('pending', 'valid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet invalide ou annulé');
  END IF;

  v_raw_token := lower(encode(extensions.gen_random_bytes(16), 'hex'));
  v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

  UPDATE public.tickets
  SET claim_token_hash = v_token_hash,
      claim_token_expires_at = now() + interval '30 days',
      updated_at = now()
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'claim_token', v_raw_token,
    'expires_at', (now() + interval '30 days')
  );
END;
$$;

-------------------------------------------------------------------------------
-- RPC 3 : claim_ticket_by_token
-- Réclamation sécurisée d'un billet offert (usage unique, hash SHA-256)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ticket_by_token(
  p_raw_claim_token text
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_token_hash text;
  v_ticket record;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Connexion requise pour réclamer un billet');
  END IF;

  IF p_raw_claim_token IS NULL OR length(trim(p_raw_claim_token)) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jeton de réclamation invalide');
  END IF;

  v_token_hash := encode(extensions.digest(trim(p_raw_claim_token), 'sha256'), 'hex');

  SELECT id, event_id, status, is_claimed, claim_token_expires_at, buyer_user_id, user_id
  INTO v_ticket
  FROM public.tickets
  WHERE claim_token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable ou lien inexistant');
  END IF;

  IF v_ticket.is_claimed OR v_ticket.user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet a déjà été réclamé');
  END IF;

  IF v_ticket.status NOT IN ('pending', 'valid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet n''est plus disponible (annulé ou remboursé)');
  END IF;

  IF v_ticket.claim_token_expires_at IS NOT NULL AND now() > v_ticket.claim_token_expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce lien de réclamation a expiré');
  END IF;

  UPDATE public.tickets
  SET user_id = v_caller_id,
      is_claimed = true,
      claimed_at = now(),
      claim_token_hash = NULL,
      claim_token_expires_at = NULL,
      updated_at = now()
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'event_id', v_ticket.event_id,
    'message', 'Félicitations ! Le billet est désormais disponible dans vos billets.'
  );
END;
$$;

-------------------------------------------------------------------------------
-- RPC 4 : request_ticket_refund
-- Exige tickets.status = 'valid' ET payments.status = 'successful'.
-- Déduit reason_type depuis events.status. Utilise tickets.price_paid.
-- Fallback phone et provider issus du paiement d'origine.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_ticket_refund(
  p_ticket_id uuid,
  p_reason_details text,
  p_custom_refund_phone text DEFAULT NULL,
  p_custom_payment_provider text DEFAULT NULL
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_ticket record;
  v_event record;
  v_payment record;
  v_deduced_reason text;
  v_provider text;
  v_phone text;
  v_amount_xof integer;
  v_refund_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  -- 1. Verrouillage du ticket
  SELECT id, event_id, payment_id, buyer_user_id, user_id, price_paid, status
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  -- Seul le payeur (acheteur initial) est autorisé à demander le remboursement financier
  IF COALESCE(v_ticket.buyer_user_id, v_ticket.user_id) <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul l''acheteur initial ayant payé le billet peut demander le remboursement');
  END IF;

  -- Condition stricte de statut de billet
  IF v_ticket.status <> 'valid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul un billet valide et non utilisé peut être remboursé');
  END IF;

  IF v_ticket.payment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune référence de transaction financière liée à ce billet');
  END IF;

  -- 2. Vérification du paiement d'origine
  SELECT id, status, payment_provider, payment_phone, amount_xof
  INTO v_payment
  FROM public.payments
  WHERE id = v_ticket.payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement d''origine introuvable');
  END IF;

  IF v_payment.status <> 'successful' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le paiement de ce billet n''a pas été validé avec succès');
  END IF;

  -- 3. Vérification de l'événement et déduction serveur du motif
  SELECT id, status, postponed_to, postponement_deadline, starts_at
  INTO v_event
  FROM public.events
  WHERE id = v_ticket.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  IF v_event.status = 'cancelled' THEN
    v_deduced_reason := 'cancellation';
  ELSIF v_event.status = 'postponed' THEN
    IF v_event.postponement_deadline IS NOT NULL AND now() > v_event.postponement_deadline THEN
      RETURN jsonb_build_object('success', false, 'error', 'Le délai de rétractation pour report est dépassé');
    END IF;
    v_deduced_reason := 'postponement';
  ELSE
    -- Pour un événement normal, le client formule une demande volontaire soumise à l'organisateur
    v_deduced_reason := 'customer_request';
  END IF;

  -- 4. Fournisseur et numéro de remboursement : par défaut ceux du paiement d'origine
  v_provider := COALESCE(NULLIF(trim(p_custom_payment_provider), ''), v_payment.payment_provider);
  v_phone := COALESCE(NULLIF(trim(p_custom_refund_phone), ''), v_payment.payment_phone);

  IF v_provider NOT IN ('tmoney', 'flooz', 'mtn') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opérateur Mobile Money non reconnu');
  END IF;

  IF length(v_phone) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Numéro Mobile Money invalide');
  END IF;

  -- 5. Montant strict entier XOF depuis tickets.price_paid
  v_amount_xof := ROUND(v_ticket.price_paid)::integer;

  -- 6. Gel immédiat du ticket (QR code invalidé)
  UPDATE public.tickets
  SET status = 'frozen',
      postponed_decision = CASE WHEN v_deduced_reason = 'postponement' THEN 'refund_requested' ELSE postponed_decision END,
      updated_at = now()
  WHERE id = v_ticket.id;

  -- 7. Insertion de la demande de remboursement
  INSERT INTO public.ticket_refunds (
    ticket_id,
    payment_id,
    event_id,
    requester_user_id,
    status,
    reason_type,
    reason_details,
    amount_xof,
    currency,
    payment_provider,
    refund_phone
  ) VALUES (
    v_ticket.id,
    v_ticket.payment_id,
    v_ticket.event_id,
    v_caller_id,
    'requested',
    v_deduced_reason,
    trim(COALESCE(p_reason_details, '')),
    v_amount_xof,
    'XOF',
    v_provider,
    v_phone
  ) RETURNING id INTO v_refund_id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'ticket_id', v_ticket.id,
    'amount_xof', v_amount_xof,
    'reason_type', v_deduced_reason,
    'status', 'requested',
    'message', 'Demande enregistrée. Billet gelé en attente du traitement Mobile Money.'
  );
END;
$$;

-------------------------------------------------------------------------------
-- RPC 5 : review_refund (Organisateur de l'événement)
-- Permet à l'organisateur d'approuver ou rejeter une demande.
-- En cas de rejet : dégel immédiat du ticket (remis à 'valid').
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_refund(
  p_refund_id uuid,
  p_action text, -- 'approve' ou 'reject'
  p_rejection_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_refund record;
  v_event record;
  v_new_status text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action non valide (approve ou reject)');
  END IF;

  SELECT id, ticket_id, event_id, status
  INTO v_refund
  FROM public.ticket_refunds
  WHERE id = p_refund_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demande de remboursement introuvable');
  END IF;

  IF v_refund.status NOT IN ('requested', 'under_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette demande a déjà été traitée ou clôturée');
  END IF;

  SELECT id, organizer_user_id
  INTO v_event
  FROM public.events
  WHERE id = v_refund.event_id;

  IF v_event.organizer_user_id <> v_caller_id AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action réservée à l''organisateur de l''événement');
  END IF;

  IF p_action = 'approve' THEN
    v_new_status := 'approved';
    
    UPDATE public.ticket_refunds
    SET status = 'approved',
        reviewed_by = v_caller_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_refund.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'message', 'Demande approuvée. En attente d''exécution par l''opérateur.'
    );
  ELSE
    v_new_status := 'rejected';

    UPDATE public.ticket_refunds
    SET status = 'rejected',
        rejection_reason = trim(COALESCE(p_rejection_reason, 'Refusé par l''organisateur')),
        reviewed_by = v_caller_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_refund.id;

    -- Dégel immédiat du ticket : remis à 'valid'
    UPDATE public.tickets
    SET status = 'valid',
        postponed_decision = 'pending',
        updated_at = now()
    WHERE id = v_refund.ticket_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'message', 'Demande refusée. Le billet a été dégelé et redevient utilisable.'
    );
  END IF;
END;
$$;

-------------------------------------------------------------------------------
-- RPC 6 : complete_presence_challenge
-- Défi de présence fun : aucun hint divulgué, 3 essais max, fenêtre starts_at -> starts_at + 15 min.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_presence_challenge(
  p_ticket_id uuid,
  p_submitted_pattern text
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_ticket record;
  v_event record;
  v_now timestamptz := now();
  v_expected_pattern text;
  v_badge_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  IF p_submitted_pattern IS NULL OR length(trim(p_submitted_pattern)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Motif non soumis');
  END IF;

  SELECT id, event_id, user_id, status, presence_challenge_seed, challenge_attempts
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  IF v_ticket.user_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous n''êtes pas le détenteur de ce billet');
  END IF;

  IF v_ticket.status NOT IN ('valid', 'used') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce billet n''est pas éligible au défi');
  END IF;

  -- Limite stricte : 3 essais par billet
  IF v_ticket.challenge_attempts >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nombre maximal de tentatives atteint pour ce billet (3/3)');
  END IF;

  -- Fenêtre horaire stricte du serveur
  SELECT id, title, starts_at
  INTO v_event
  FROM public.events
  WHERE id = v_ticket.event_id;

  IF v_event.starts_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Date de début indéterminée');
  END IF;

  IF v_now < v_event.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le défi sera déverrouillé précisément à l''heure de début de l''événement');
  END IF;

  IF v_now > (v_event.starts_at + interval '15 minutes') THEN
    RETURN jsonb_build_object('success', false, 'error', 'La fenêtre d''accueil de 15 minutes est désormais refermée');
  END IF;

  -- Calcul déterministe serveur
  v_expected_pattern := (
    ((get_byte(extensions.digest(v_event.id::text || COALESCE(v_ticket.presence_challenge_seed, 'gbaigbance'), 'sha256'), 0) % 4) + 1)::text || '-' ||
    ((get_byte(extensions.digest(v_event.id::text || COALESCE(v_ticket.presence_challenge_seed, 'gbaigbance'), 'sha256'), 1) % 4) + 1)::text || '-' ||
    ((get_byte(extensions.digest(v_event.id::text || COALESCE(v_ticket.presence_challenge_seed, 'gbaigbance'), 'sha256'), 2) % 4) + 1)::text || '-' ||
    ((get_byte(extensions.digest(v_event.id::text || COALESCE(v_ticket.presence_challenge_seed, 'gbaigbance'), 'sha256'), 3) % 4) + 1)::text
  );

  -- Si erreur : incrémente attempts et NE RENVOIE AUCUN HINT
  IF trim(p_submitted_pattern) <> v_expected_pattern THEN
    UPDATE public.tickets
    SET challenge_attempts = challenge_attempts + 1,
        updated_at = now()
    WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
      'success', false, 
      'attempts_left', (2 - v_ticket.challenge_attempts),
      'error', 'Motif incorrect ! Il vous reste ' || (2 - v_ticket.challenge_attempts)::text || ' essai(s).'
    );
  END IF;

  -- Succès : insertion avec ON CONFLICT DO NOTHING pour préserver le timestamp initial
  INSERT INTO public.event_presence_badges (
    event_id,
    user_id,
    ticket_id,
    challenge_type,
    badge_name,
    badge_icon,
    is_public_on_profile
  ) VALUES (
    v_event.id,
    v_caller_id,
    v_ticket.id,
    'rhythm_pattern',
    'Pionnier du Live',
    'flame',
    false -- Opt-in désactivé par défaut
  )
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_badge_id;

  RETURN jsonb_build_object(
    'success', true,
    'badge_name', 'Pionnier du Live',
    'badge_icon', 'flame',
    'message', 'Félicitations ! Défi validé avec succès. Badge "Pionnier du Live" débloqué !'
  );
END;
$$;

-------------------------------------------------------------------------------
-- RPC 7 : expire_pending_payments
-- Libère le stock des commandes non payées après expiration (15 min)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_pending_payments() 
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired_row record;
  v_count integer := 0;
BEGIN
  FOR v_expired_row IN
    SELECT id, ticket_option_id, quantity
    FROM public.payments
    WHERE status = 'pending' AND expires_at <= now()
    FOR UPDATE
  LOOP
    -- 1. Marquer paiement expiré
    UPDATE public.payments
    SET status = 'expired', updated_at = now()
    WHERE id = v_expired_row.id;

    -- 2. Marquer billets expirés
    UPDATE public.tickets
    SET status = 'expired', updated_at = now()
    WHERE payment_id = v_expired_row.id AND status = 'pending';

    -- 3. Libérer le stock réservé
    UPDATE public.ticket_options
    SET quantity_sold = GREATEST(quantity_sold - v_expired_row.quantity, 0)
    WHERE id = v_expired_row.ticket_option_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-------------------------------------------------------------------------------
-- RPCs RÉSERVÉES AU SERVICE_ROLE (Pour l'Agrégateur Mobile Money & Webhooks)
-------------------------------------------------------------------------------

-- 1. confirm_payment : Passage à 'successful' et validation des billets 'valid'
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_payment_id uuid,
  p_operator_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_payment record;
BEGIN
  v_role := auth.jwt() ->> 'role';
  IF v_role <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, status, event_id, quantity INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Paiement introuvable'); END IF;
  IF v_payment.status = 'successful' THEN RETURN jsonb_build_object('success', true, 'message', 'Déjà validé'); END IF;

  UPDATE public.payments
  SET status = 'successful', operator_reference = p_operator_reference, updated_at = now()
  WHERE id = p_payment_id;

  UPDATE public.tickets
  SET status = 'valid', updated_at = now()
  WHERE payment_id = p_payment_id AND status = 'pending';

  UPDATE public.events
  SET attendees_count = attendees_count + v_payment.quantity, updated_at = now()
  WHERE id = v_payment.event_id;

  RETURN jsonb_build_object('success', true, 'message', 'Paiement confirmé et billets activés');
END;
$$;

-- 2. mark_refund_processing
CREATE OR REPLACE FUNCTION public.mark_refund_processing(
  p_refund_id uuid,
  p_operator_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  UPDATE public.ticket_refunds
  SET status = 'processing', operator_reference = p_operator_reference, updated_at = now()
  WHERE id = p_refund_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. mark_refund_done : Clôture à 'refunded', tickets.status = 'refunded', décrémente quantity_sold
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
BEGIN
  IF (auth.jwt() ->> 'role') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, ticket_id, payment_id, event_id INTO v_refund FROM public.ticket_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable'); END IF;

  SELECT id, ticket_option_id INTO v_ticket FROM public.tickets WHERE id = v_refund.ticket_id FOR UPDATE;

  UPDATE public.ticket_refunds
  SET status = 'refunded', operator_reference = COALESCE(p_operator_reference, operator_reference), completed_at = now(), updated_at = now()
  WHERE id = p_refund_id;

  UPDATE public.tickets
  SET status = 'refunded', updated_at = now()
  WHERE id = v_refund.ticket_id;

  -- Décrémente quantity_sold et attendees_count
  IF v_ticket.ticket_option_id IS NOT NULL THEN
    UPDATE public.ticket_options
    SET quantity_sold = GREATEST(quantity_sold - 1, 0)
    WHERE id = v_ticket.ticket_option_id;
  END IF;

  UPDATE public.events
  SET attendees_count = GREATEST(attendees_count - 1, 0), updated_at = now()
  WHERE id = v_refund.event_id;

  RETURN jsonb_build_object('success', true, 'message', 'Remboursement exécuté avec succès');
END;
$$;

-- 4. mark_refund_failed
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
  IF (auth.jwt() ->> 'role') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, ticket_id INTO v_refund FROM public.ticket_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable'); END IF;

  UPDATE public.ticket_refunds
  SET status = 'failed', rejection_reason = p_rejection_reason, updated_at = now()
  WHERE id = p_refund_id;

  -- Dégèle le ticket pour qu'il redevienne valide suite à l'échec de virement
  UPDATE public.tickets
  SET status = 'valid', updated_at = now()
  WHERE id = v_refund.ticket_id;

  RETURN jsonb_build_object('success', true, 'message', 'Échec enregistré et billet dégelé');
END;
$$;

-- ============================================================================
-- 8. RESTRICTION DES PERMISSIONS D'EXÉCUTION (REVOKE ALL FROM PUBLIC / anon)
-- ============================================================================
REVOKE ALL ON FUNCTION public.purchase_tickets_multi(uuid, uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_tickets_multi(uuid, uuid, jsonb, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.regenerate_claim_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_claim_link(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_ticket_by_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_ticket_by_token(text) TO authenticated;

REVOKE ALL ON FUNCTION public.request_ticket_refund(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_ticket_refund(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.review_refund(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_refund(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_presence_challenge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_presence_challenge(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.expire_pending_payments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_pending_payments() TO authenticated;
