-- Corrige toggle_event_like : logique de compteur fiable
-- Source de vérité = COUNT(event_likes)
-- Les événements is_demo gardent leurs likes_count seed (marketing)
-- Appliqué le 2026-11-23

CREATE OR REPLACE FUNCTION public.toggle_event_like(p_event_id uuid)
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
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evenement invalide', 'code', 'VALIDATION');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM event_likes WHERE event_id = p_event_id AND user_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM event_likes WHERE event_id = p_event_id AND user_id = v_uid;
  ELSE
    INSERT INTO event_likes (event_id, user_id)
    VALUES (p_event_id, v_uid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Source de vérité : compter les lignes réelles
  SELECT COUNT(*)::integer INTO v_count
  FROM event_likes
  WHERE event_id = p_event_id;

  -- Ne pas écraser les compteurs marketing des événements démo (seed)
  UPDATE events
  SET likes_count = v_count,
      updated_at = now()
  WHERE id = p_event_id
    AND COALESCE(is_demo, false) = false;

  RETURN jsonb_build_object(
    'success', true,
    'liked', NOT v_exists,
    'likes_count', v_count,
    'code', CASE WHEN v_exists THEN 'UNLIKED' ELSE 'LIKED' END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.toggle_event_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_event_like(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.toggle_event_like(uuid) FROM anon;

-- Rollback : restaurer l'ancienne définition depuis le schéma précédent si besoin.
