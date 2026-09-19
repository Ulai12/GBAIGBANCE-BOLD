-- ====================================================================
-- GBAIGBANCE — MIGRATION: ASSISTANT IA & RATE LIMITING PERSISTANT
-- ====================================================================

-- 1. Table pour le rate limiting persistant (partagée entre toutes les instances Edge Functions)
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- 'user_<uuid>' ou 'ip_<ip>'
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_ident_window_idx ON ai_rate_limits(identifier, window_start);

-- 2. Fonction RPC atomique de vérification et d'incrémentation du quota IA
CREATE OR REPLACE FUNCTION check_and_increment_ai_quota(
  p_identifier text,
  p_is_authenticated boolean,
  p_window_minutes integer DEFAULT 10,
  p_max_per_window integer DEFAULT 20,
  p_daily_max integer DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - (p_window_minutes || ' minutes')::interval;
  v_day_start timestamptz := v_now - interval '24 hours';
  v_window_count integer := 0;
  v_daily_count integer := 0;
  v_limit_window integer := CASE WHEN p_is_authenticated THEN p_max_per_window ELSE 5 END;
  v_limit_daily integer := CASE WHEN p_is_authenticated THEN p_daily_max ELSE 15 END;
BEGIN
  -- Nettoyage automatique des anciennes entrées (> 48h)
  DELETE FROM ai_rate_limits WHERE window_start < (v_now - interval '48 hours');

  -- Vérification du quota journalier (24h)
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_daily_count
  FROM ai_rate_limits
  WHERE identifier = p_identifier AND window_start >= v_day_start;

  IF v_daily_count >= v_limit_daily THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', CASE 
        WHEN p_is_authenticated THEN 'Plafond journalier atteint (60 messages). Revenez demain ou réessayez plus tard.'
        ELSE 'Limite invité atteinte pour aujourd''hui. Veuillez vous connecter pour continuer à échanger avec l''assistant.'
      END
    );
  END IF;

  -- Vérification du quota par fenêtre (10 minutes)
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_window_count
  FROM ai_rate_limits
  WHERE identifier = p_identifier AND window_start >= v_window_start;

  IF v_window_count >= v_limit_window THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'window_limit',
      'message', CASE 
        WHEN p_is_authenticated THEN 'Trop de messages en peu de temps. Veuillez patienter quelques minutes.'
        ELSE 'Vous avez atteint la limite en mode invité (5 messages). Connectez-vous gratuitement pour continuer !'
      END
    );
  END IF;

  -- Incrémentation du compteur
  INSERT INTO ai_rate_limits (identifier, window_start, request_count)
  VALUES (p_identifier, v_now, 1);

  RETURN json_build_object(
    'allowed', true,
    'remaining_window', v_limit_window - (v_window_count + 1),
    'remaining_daily', v_limit_daily - (v_daily_count + 1)
  );
END;
$$;

-- 3. Fonction RPC optimisée pour la recherche géographique d'événements (formule Haversine)
-- Écarte les événements terminés, non publiés et les IDs de test/mock
CREATE OR REPLACE FUNCTION get_nearby_events_rpc(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 25,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  city text,
  country text,
  price_min numeric,
  price_max numeric,
  currency text,
  cover_url text,
  distance_km numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    e.id,
    e.title,
    e.category,
    e.starts_at,
    e.ends_at,
    e.location_name,
    e.city,
    e.country,
    e.price_min,
    e.price_max,
    e.currency,
    e.cover_url,
    ROUND((
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(e.latitude))
        ))
      )
    )::numeric, 1) AS distance_km
  FROM events e
  WHERE e.status = 'published'
    AND (e.ends_at >= now() OR (e.ends_at IS NULL AND e.starts_at >= now() - interval '6 hours'))
    AND e.latitude IS NOT NULL 
    AND e.longitude IS NOT NULL
    AND e.id::text NOT LIKE 'mock-%'
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(e.latitude))
        ))
      )
    ) <= LEAST(p_radius_km, 25)
  ORDER BY distance_km ASC, e.starts_at ASC
  LIMIT LEAST(p_limit, 8);
$$;

-- Permissions pour anon et authenticated
GRANT EXECUTE ON FUNCTION check_and_increment_ai_quota TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_events_rpc TO anon, authenticated;
