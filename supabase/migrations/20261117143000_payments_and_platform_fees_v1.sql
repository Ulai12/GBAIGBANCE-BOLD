-- Foundation paiements + commission plateforme (XOF, entiers)
-- Appliquee sur projet lwwiolbofrqakvrdvbbj le 2026-11-17
-- Retrocompatible: tables nouvelles, colonnes nullables, pas de DROP.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value) VALUES
  ('ticket_fees', jsonb_build_object(
    'currency', 'XOF',
    'mobile_money_percent_bps', 250,
    'mobile_money_fixed_xof', 50,
    'card_percent_bps', 350,
    'card_fixed_xof', 100,
    'operator_percent_bps', 120,
    'fee_payer_default', 'buyer',
    'min_platform_fee_xof', 0,
    'notes', 'bps = basis points (250 = 2.5%). fee_payer: buyer | organizer'
  ))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_read_authenticated ON public.platform_settings;
CREATE POLICY platform_settings_read_authenticated ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS platform_settings_read_anon ON public.platform_settings;
CREATE POLICY platform_settings_read_anon ON public.platform_settings
  FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_option_id uuid REFERENCES public.ticket_options(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'pending'
    CHECK (provider = ANY (ARRAY['pending','tmoney','flooz','moov','wave','card','free','manual'])),
  provider_ref text,
  status text NOT NULL DEFAULT 'initiated'
    CHECK (status = ANY (ARRAY['initiated','pending','succeeded','failed','cancelled','refunded','partially_refunded'])),
  amount_face_xof integer NOT NULL DEFAULT 0 CHECK (amount_face_xof >= 0),
  platform_fee_xof integer NOT NULL DEFAULT 0 CHECK (platform_fee_xof >= 0),
  operator_fee_xof integer NOT NULL DEFAULT 0 CHECK (operator_fee_xof >= 0),
  amount_charged_xof integer NOT NULL DEFAULT 0 CHECK (amount_charged_xof >= 0),
  organizer_payout_xof integer NOT NULL DEFAULT 0 CHECK (organizer_payout_xof >= 0),
  fee_payer text NOT NULL DEFAULT 'buyer' CHECK (fee_payer = ANY (ARRAY['buyer','organizer'])),
  currency text NOT NULL DEFAULT 'XOF',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  payment_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_uidx
  ON public.payments (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON public.payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_buyer_user_id_idx ON public.payments (buyer_user_id);
CREATE INDEX IF NOT EXISTS payments_event_id_idx ON public.payments (event_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_option_id uuid REFERENCES public.ticket_options(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS platform_fee_xof integer,
  ADD COLUMN IF NOT EXISTS organizer_net_xof integer,
  ADD COLUMN IF NOT EXISTS fee_payer text CHECK (fee_payer IS NULL OR fee_payer = ANY (ARRAY['buyer','organizer']));

CREATE INDEX IF NOT EXISTS tickets_payment_id_idx ON public.tickets (payment_id);
CREATE INDEX IF NOT EXISTS tickets_ticket_option_id_idx ON public.tickets (ticket_option_id);

ALTER TABLE public.ticket_options
  ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'buyer'
    CHECK (fee_payer = ANY (ARRAY['buyer','organizer'])),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sales_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS sales_end_at timestamptz;

CREATE OR REPLACE FUNCTION public.compute_ticket_fees(
  p_unit_price_xof integer,
  p_quantity integer DEFAULT 1,
  p_payment_method text DEFAULT 'mobile_money',
  p_fee_payer text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_settings jsonb;
  v_qty integer;
  v_face integer;
  v_pct_bps integer;
  v_fixed integer;
  v_op_bps integer;
  v_platform integer;
  v_operator integer;
  v_charged integer;
  v_payout integer;
  v_payer text;
BEGIN
  v_qty := GREATEST(COALESCE(p_quantity, 1), 1);
  v_face := GREATEST(COALESCE(p_unit_price_xof, 0), 0) * v_qty;

  SELECT value INTO v_settings FROM platform_settings WHERE key = 'ticket_fees';
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object(
      'mobile_money_percent_bps', 250,
      'mobile_money_fixed_xof', 50,
      'card_percent_bps', 350,
      'card_fixed_xof', 100,
      'operator_percent_bps', 120,
      'fee_payer_default', 'buyer'
    );
  END IF;

  v_payer := COALESCE(NULLIF(p_fee_payer, ''), v_settings->>'fee_payer_default', 'buyer');
  IF v_payer NOT IN ('buyer', 'organizer') THEN
    v_payer := 'buyer';
  END IF;

  IF v_face = 0 OR COALESCE(p_payment_method, 'free') = 'free' THEN
    RETURN jsonb_build_object(
      'currency', 'XOF',
      'quantity', v_qty,
      'amount_face_xof', 0,
      'platform_fee_xof', 0,
      'operator_fee_xof', 0,
      'amount_charged_xof', 0,
      'organizer_payout_xof', 0,
      'fee_payer', v_payer,
      'fee_percent_bps', 0,
      'fixed_fee_xof', 0
    );
  END IF;

  IF p_payment_method = 'card' THEN
    v_pct_bps := COALESCE((v_settings->>'card_percent_bps')::integer, 350);
    v_fixed := COALESCE((v_settings->>'card_fixed_xof')::integer, 100);
  ELSE
    v_pct_bps := COALESCE((v_settings->>'mobile_money_percent_bps')::integer, 250);
    v_fixed := COALESCE((v_settings->>'mobile_money_fixed_xof')::integer, 50);
  END IF;

  v_op_bps := COALESCE((v_settings->>'operator_percent_bps')::integer, 120);
  v_platform := (v_face * v_pct_bps) / 10000 + v_fixed;
  v_operator := (v_face * v_op_bps) / 10000;

  IF v_payer = 'buyer' THEN
    v_charged := v_face + v_platform;
    v_payout := v_face;
  ELSE
    v_charged := v_face;
    v_payout := GREATEST(v_face - v_platform, 0);
  END IF;

  RETURN jsonb_build_object(
    'currency', 'XOF',
    'quantity', v_qty,
    'amount_face_xof', v_face,
    'platform_fee_xof', v_platform,
    'operator_fee_xof', v_operator,
    'amount_charged_xof', v_charged,
    'organizer_payout_xof', v_payout,
    'fee_payer', v_payer,
    'fee_percent_bps', v_pct_bps,
    'fixed_fee_xof', v_fixed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.compute_ticket_fees(integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_ticket_fees(integer, integer, text, text) TO anon, authenticated;

COMMENT ON TABLE public.payments IS 'Ledger paiements billets. Confirmation webhook + idempotency_key.';
COMMENT ON FUNCTION public.compute_ticket_fees IS 'Calcule face, frais plateforme, operateur, montant debite, payout organisateur (XOF).';
