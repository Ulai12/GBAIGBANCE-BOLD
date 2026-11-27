-- Align toggle_artist_follow / toggle_organization_follow with toggle_event_like:
-- COUNT(*) is source of truth for followers_count; protect is_demo seed counters.

CREATE OR REPLACE FUNCTION public.toggle_artist_follow(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise', 'code', 'AUTH_REQUIRED');
  END IF;
  IF p_artist_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Artiste invalide', 'code', 'VALIDATION');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM artist_follows WHERE artist_id = p_artist_id AND user_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM artist_follows WHERE artist_id = p_artist_id AND user_id = v_uid;
  ELSE
    INSERT INTO artist_follows (artist_id, user_id)
    VALUES (p_artist_id, v_uid)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM artist_follows
  WHERE artist_id = p_artist_id;

  UPDATE artists
  SET followers_count = v_count
  WHERE id = p_artist_id
    AND COALESCE(is_demo, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'following', NOT v_exists,
    'followers_count', v_count,
    'code', CASE WHEN v_exists THEN 'UNFOLLOWED' ELSE 'FOLLOWED' END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_organization_follow(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentification requise', 'code', 'AUTH_REQUIRED');
  END IF;
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organisation invalide', 'code', 'VALIDATION');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM organization_follows WHERE organization_id = p_organization_id AND user_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM organization_follows WHERE organization_id = p_organization_id AND user_id = v_uid;
  ELSE
    INSERT INTO organization_follows (organization_id, user_id)
    VALUES (p_organization_id, v_uid)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM organization_follows
  WHERE organization_id = p_organization_id;

  UPDATE organizations
  SET followers_count = v_count
  WHERE id = p_organization_id
    AND COALESCE(is_demo, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'following', NOT v_exists,
    'followers_count', v_count,
    'code', CASE WHEN v_exists THEN 'UNFOLLOWED' ELSE 'FOLLOWED' END
  );
END;
$function$;

-- Keep EXECUTE for authenticated (frontend RPC); deny anon.
REVOKE EXECUTE ON FUNCTION public.toggle_artist_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_artist_follow(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.toggle_organization_follow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_organization_follow(uuid) TO authenticated, service_role;

-- Rollback: restore previous function bodies from history before this migration.
