-- 20261125121023_secure_ticket_mutations_and_attendee_access.sql
-- Admin check encapsulated in a non-public SECURITY DEFINER helper for RLS.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- Les propriétaires et équipes autorisées peuvent lire les billets de leur événement
-- pour les métriques et la gestion; les participants ne voient que leurs billets.
DROP POLICY IF EXISTS tickets_select_secure ON public.tickets;
CREATE POLICY tickets_select_secure ON public.tickets
FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id
      AND (
        e.organizer_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.event_collaborators c
          WHERE c.event_id = e.id
            AND c.user_id = (SELECT auth.uid())
            AND c.status = 'accepted'
        )
      )
  )
  OR public.is_platform_admin()
);

-- Annulation transactionnelle : seule la personne à qui le billet appartient peut
-- l'annuler; le stock et le compteur d'inscrits sont réconciliés avec sa quantité.
CREATE OR REPLACE FUNCTION public.cancel_ticket(p_ticket_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_quantity integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  IF v_ticket.status NOT IN ('active', 'valid') THEN
    RETURN json_build_object('success', false, 'error', 'Billet non annulable dans son état actuel');
  END IF;

  v_quantity := GREATEST(COALESCE(v_ticket.quantity, 1), 1);

  UPDATE public.tickets
  SET status = 'cancelled'
  WHERE id = p_ticket_id;

  IF v_ticket.ticket_option_id IS NOT NULL THEN
    UPDATE public.ticket_options
    SET quantity_sold = GREATEST(COALESCE(quantity_sold, 0) - v_quantity, 0)
    WHERE id = v_ticket.ticket_option_id;
  ELSE
    UPDATE public.ticket_options
    SET quantity_sold = GREATEST(COALESCE(quantity_sold, 0) - v_quantity, 0)
    WHERE id = (
      SELECT id FROM public.ticket_options
      WHERE event_id = v_ticket.event_id
        AND ticket_type = v_ticket.ticket_type
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;

  UPDATE public.events
  SET attendees_count = GREATEST(COALESCE(attendees_count, 0) - v_quantity, 0),
      updated_at = now()
  WHERE id = v_ticket.event_id;

  RETURN json_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_ticket(uuid) TO authenticated, service_role;

-- La liste des participants reste consultable pour les événements publiés,
-- mais les événements privés/pending restent réservés à leur équipe.
CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS TABLE(user_id uuid, name text, avatar_url text, ticket_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT e.status, e.organizer_user_id
  INTO v_status, v_owner
  FROM public.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_status <> 'published'
     AND v_owner IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.event_collaborators c
       WHERE c.event_id = p_event_id
         AND c.user_id = auth.uid()
         AND c.status = 'accepted'
     )
     AND NOT public.is_platform_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT t.user_id,
         COALESCE(p.name, 'Participant') AS name,
         p.avatar_url,
         COUNT(*)::bigint AS ticket_count
  FROM public.tickets t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE t.event_id = p_event_id
    AND t.status IN ('valid', 'active', 'used')
    AND t.user_id IS NOT NULL
  GROUP BY t.user_id, p.name, p.avatar_url
  ORDER BY COUNT(*) DESC
  LIMIT 300;
END;
$$;
REVOKE ALL ON FUNCTION public.get_event_attendees(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated, service_role;
