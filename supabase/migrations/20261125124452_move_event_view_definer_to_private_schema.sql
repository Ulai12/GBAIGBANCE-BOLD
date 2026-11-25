-- 20261125124452_move_event_view_definer_to_private_schema.sql
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.record_event_view_internal(p_event_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_headers jsonb;
  v_ip text;
  v_visitor_key uuid;
  inserted_event boolean := false;
  current_views bigint := 0;
BEGIN
  IF p_event_id IS NULL THEN RAISE EXCEPTION 'event_id is required'; END IF;
  IF auth.uid() IS NOT NULL THEN
    v_visitor_key := auth.uid();
  ELSE
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb;
    v_ip := COALESCE(
      NULLIF(v_headers ->> 'cf-connecting-ip', ''),
      NULLIF(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
      'unknown'
    );
    v_visitor_key := substring(encode(extensions.digest(v_ip, 'sha256'), 'hex') FROM 1 FOR 32)::uuid;
  END IF;
  INSERT INTO public.event_view_daily(event_id, visitor_key, viewed_on)
  SELECT e.id, v_visitor_key, (now() AT TIME ZONE 'utc')::date
  FROM public.events e
  WHERE e.id = p_event_id AND e.is_demo = false AND e.status = 'published'
  ON CONFLICT DO NOTHING
  RETURNING true INTO inserted_event;
  IF COALESCE(inserted_event, false) THEN
    UPDATE public.events
    SET views_count = GREATEST(COALESCE(views_count, 0), 0) + 1, updated_at = now()
    WHERE id = p_event_id AND is_demo = false AND status = 'published';
  END IF;
  SELECT GREATEST(COALESCE(e.views_count, 0), 0)::bigint INTO current_views
  FROM public.events e
  WHERE e.id = p_event_id AND e.is_demo = false AND e.status = 'published';
  RETURN COALESCE(current_views, 0);
END;
$$;
REVOKE ALL ON FUNCTION private.record_event_view_internal(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.record_event_view_internal(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_event_view(p_event_id uuid, p_visitor_key uuid)
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.record_event_view_internal(p_event_id);
$$;
REVOKE ALL ON FUNCTION public.record_event_view(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_event_view(uuid, uuid) TO anon, authenticated;
