-- Safe one-shot resync of denormalized social counters (non-demo only).
-- Callable by service_role (dashboard / admin). Does not touch is_demo rows.
-- Rollback: DROP FUNCTION IF EXISTS public.resync_social_counters();

CREATE OR REPLACE FUNCTION public.resync_social_counters()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_artists integer := 0;
  v_orgs integer := 0;
  v_events integer := 0;
BEGIN
  UPDATE public.artists a
  SET followers_count = COALESCE((
    SELECT COUNT(*)::integer FROM public.artist_follows af WHERE af.artist_id = a.id
  ), 0)
  WHERE COALESCE(a.is_demo, false) = false;
  GET DIAGNOSTICS v_artists = ROW_COUNT;

  UPDATE public.organizations o
  SET followers_count = COALESCE((
    SELECT COUNT(*)::integer FROM public.organization_follows of WHERE of.organization_id = o.id
  ), 0)
  WHERE COALESCE(o.is_demo, false) = false;
  GET DIAGNOSTICS v_orgs = ROW_COUNT;

  UPDATE public.events e
  SET likes_count = COALESCE((
    SELECT COUNT(*)::integer FROM public.event_likes el WHERE el.event_id = e.id
  ), 0)
  WHERE COALESCE(e.is_demo, false) = false;
  GET DIAGNOSTICS v_events = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'artists_updated', v_artists,
    'organizations_updated', v_orgs,
    'events_updated', v_events,
    'note', 'Compteurs non-démo recalculés depuis les tables de liaison. Les lignes is_demo sont laissées inchangées.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resync_social_counters() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resync_social_counters() TO service_role;
