-- Keep public attendee counters and platform analytics aligned with issued tickets.

CREATE OR REPLACE FUNCTION public.sync_attendees_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_event uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.event_id IS DISTINCT FROM NEW.event_id THEN
    UPDATE public.events
    SET attendees_count = COALESCE((
      SELECT SUM(GREATEST(COALESCE(t.quantity, 1), 0))
      FROM public.tickets t
      WHERE t.event_id = OLD.event_id
        AND lower(COALESCE(t.status, '')) IN ('active', 'valid', 'used')
    ), 0),
    updated_at = now()
    WHERE id = OLD.event_id;
  END IF;

  affected_event := CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
  IF affected_event IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.events
  SET attendees_count = COALESCE((
    SELECT SUM(GREATEST(COALESCE(t.quantity, 1), 0))
    FROM public.tickets t
    WHERE t.event_id = affected_event
      AND lower(COALESCE(t.status, '')) IN ('active', 'valid', 'used')
  ), 0),
  updated_at = now()
  WHERE id = affected_event;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendees_insert ON public.tickets;
DROP TRIGGER IF EXISTS trg_sync_attendees_update ON public.tickets;
DROP TRIGGER IF EXISTS trg_sync_attendees_delete ON public.tickets;
DROP TRIGGER IF EXISTS trg_sync_attendees_count ON public.tickets;
CREATE TRIGGER trg_sync_attendees_count
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.sync_attendees_count();

UPDATE public.events e
SET attendees_count = COALESCE((
  SELECT SUM(GREATEST(COALESCE(t.quantity, 1), 0))
  FROM public.tickets t
  WHERE t.event_id = e.id
    AND lower(COALESCE(t.status, '')) IN ('active', 'valid', 'used')
), 0);

CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  ticket_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.user_id,
    p.name,
    p.avatar_url,
    SUM(GREATEST(COALESCE(t.quantity, 1), 0))::bigint AS ticket_count
  FROM public.tickets t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE t.event_id = p_event_id
    AND t.user_id IS NOT NULL
    AND lower(COALESCE(t.status, '')) IN ('active', 'valid', 'used')
  GROUP BY t.user_id, p.name, p.avatar_url
  ORDER BY ticket_count DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  now_utc timestamptz := now();
  result jsonb;
BEGIN
  WITH real_events AS (
    SELECT e.*
    FROM public.events e
    WHERE COALESCE(e.is_demo, false) = false
  ),
  active_events AS (
    SELECT e.*
    FROM real_events e
    WHERE e.status = 'published'
      AND (e.ends_at IS NULL OR e.ends_at >= now_utc)
  ),
  valid_tickets AS (
    SELECT t.*
    FROM public.tickets t
    JOIN real_events e ON e.id = t.event_id
    WHERE lower(COALESCE(t.status, '')) IN ('active', 'valid', 'used')
  ),
  ticket_counts AS (
    SELECT t.event_id, SUM(GREATEST(COALESCE(t.quantity, 1), 0))::bigint AS participants
    FROM valid_tickets t
    GROUP BY t.event_id
  ),
  category_counts AS (
    SELECT COALESCE(e.category::text, 'other') AS category, COUNT(*)::bigint AS event_count
    FROM active_events e
    GROUP BY e.category
  ),
  ticket_days AS (
    SELECT
      (t.created_at AT TIME ZONE 'UTC')::date AS sold_on,
      SUM(GREATEST(COALESCE(t.quantity, 1), 0))::bigint AS quantity,
      SUM(GREATEST(COALESCE(t.price_paid, 0), 0))::numeric AS revenue
    FROM valid_tickets t
    GROUP BY (t.created_at AT TIME ZONE 'UTC')::date
  )
  SELECT jsonb_build_object(
    'analyticsVersion', 2,
    'isAvailable', true,
    'totalEvents', (SELECT COUNT(*) FROM active_events),
    'totalAllEvents', (SELECT COUNT(*) FROM real_events),
    'totalArtists', (SELECT COUNT(*) FROM public.artists a WHERE COALESCE(a.is_demo, false) = false),
    'totalOrganizers', (SELECT COUNT(*) FROM public.organizations o WHERE COALESCE(o.is_demo, false) = false),
    'totalTickets', (SELECT COALESCE(SUM(GREATEST(COALESCE(t.quantity, 1), 0)), 0) FROM valid_tickets t),
    'totalParticipants', (SELECT COALESCE(SUM(GREATEST(COALESCE(t.quantity, 1), 0)), 0) FROM valid_tickets t),
    'totalParticipantAccounts', (SELECT COUNT(DISTINCT user_id) FROM valid_tickets WHERE user_id IS NOT NULL),
    'totalProfiles', (SELECT COUNT(*) FROM public.profiles),
    'totalPendingPlatformInvitations', (
      SELECT COUNT(*) FROM auth.users u WHERE u.invited_at IS NOT NULL AND u.confirmed_at IS NULL
    ),
    'totalUsers', (
      SELECT COUNT(*) FROM auth.users u WHERE NOT (u.invited_at IS NOT NULL AND u.confirmed_at IS NULL)
    ),
    'totalViews', (SELECT COALESCE(SUM(GREATEST(COALESCE(e.views_count, 0), 0)), 0) FROM real_events e),
    'totalRevenue', (SELECT COALESCE(SUM(GREATEST(COALESCE(t.price_paid, 0), 0)), 0) FROM valid_tickets t),
    'totalCancelledTickets', (
      SELECT COALESCE(SUM(GREATEST(COALESCE(t.quantity, 1), 0)), 0)
      FROM public.tickets t
      JOIN real_events e ON e.id = t.event_id
      WHERE lower(COALESCE(t.status, '')) IN ('cancelled', 'canceled')
    ),
    'totalRefundedTickets', (
      SELECT COALESCE(SUM(GREATEST(COALESCE(t.quantity, 1), 0)), 0)
      FROM public.tickets t
      JOIN real_events e ON e.id = t.event_id
      WHERE lower(COALESCE(t.status, '')) = 'refunded'
    ),
    'categories', COALESCE((
      SELECT jsonb_object_agg(category, event_count) FROM category_counts
    ), '{}'::jsonb),
    'categoryBasis', 'events',
    'categoryShares', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', category,
        'count', event_count,
        'amount', 0,
        'percent', CASE WHEN (SELECT COUNT(*) FROM active_events) > 0
          THEN ROUND((event_count::numeric / (SELECT COUNT(*) FROM active_events)) * 100)::int
          ELSE 0 END
      ) ORDER BY event_count DESC)
      FROM category_counts
    ), '[]'::jsonb),
    'ticketsTimeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sold_on::text,
        'created_at', sold_on::text,
        'created_at_ms', (EXTRACT(EPOCH FROM (sold_on::timestamp AT TIME ZONE 'UTC')) * 1000)::bigint,
        'price_paid', revenue,
        'quantity', quantity
      ) ORDER BY sold_on)
      FROM ticket_days
    ), '[]'::jsonb),
    'eventsTimeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'starts_at_ms', (EXTRACT(EPOCH FROM e.starts_at) * 1000)::bigint,
        'attendees', COALESCE(tc.participants, 0)
      ) ORDER BY e.starts_at)
      FROM real_events e
      LEFT JOIN ticket_counts tc ON tc.event_id = e.id
      WHERE e.status IN ('published', 'completed')
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO service_role;

-- Ticket rows are the source of truth: only these rows represent issued,
-- non-refunded tickets. The triggers above keep the cached card count in sync.
CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid, p_operator_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_role text;
BEGIN
  v_role := auth.jwt() ->> 'role';
  IF v_role IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé au service_role');
  END IF;

  SELECT id, status INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement introuvable');
  END IF;
  IF v_payment.status = 'successful' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Déjà validé');
  END IF;
  IF v_payment.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'État de paiement incompatible');
  END IF;

  UPDATE public.payments
  SET status = 'successful', operator_reference = p_operator_reference, updated_at = now()
  WHERE id = p_payment_id;
  UPDATE public.tickets
  SET status = 'valid', updated_at = now()
  WHERE payment_id = p_payment_id AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'message', 'Paiement confirmé et billets activés');
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text) TO service_role;

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

  SELECT id, ticket_id, payment_id, status
  INTO v_refund
  FROM public.ticket_refunds
  WHERE id = p_refund_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remboursement introuvable');
  END IF;
  IF v_refund.status = 'refunded' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Déjà remboursé');
  END IF;
  IF v_refund.status <> 'processing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remboursement non préparé');
  END IF;

  SELECT id, status INTO v_payment
  FROM public.payments
  WHERE id = v_refund.payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement introuvable');
  END IF;
  IF v_payment.status NOT IN ('successful', 'partially_refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non remboursable');
  END IF;

  SELECT id, ticket_option_id, status, quantity
  INTO v_ticket
  FROM public.tickets
  WHERE id = v_refund.ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet introuvable');
  END IF;
  IF v_ticket.status NOT IN ('valid', 'frozen') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Billet non remboursable');
  END IF;

  UPDATE public.ticket_refunds
  SET status = 'refunded',
      operator_reference = COALESCE(p_operator_reference, operator_reference),
      completed_at = now(),
      updated_at = now()
  WHERE id = p_refund_id AND status = 'processing';
  UPDATE public.tickets
  SET status = 'refunded', updated_at = now()
  WHERE id = v_refund.ticket_id;

  IF v_ticket.ticket_option_id IS NOT NULL THEN
    UPDATE public.ticket_options
    SET quantity_sold = GREATEST(quantity_sold - GREATEST(v_ticket.quantity, 1), 0)
    WHERE id = v_ticket.ticket_option_id;
  END IF;

  UPDATE public.payments p
  SET status = CASE WHEN EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.payment_id = v_refund.payment_id AND t.status <> 'refunded'
  ) THEN 'partially_refunded' ELSE 'refunded' END,
      updated_at = now()
  WHERE p.id = v_refund.payment_id;

  RETURN jsonb_build_object('success', true, 'message', 'Remboursement exécuté avec succès');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_refund_done(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_refund_done(uuid, text) TO service_role;
