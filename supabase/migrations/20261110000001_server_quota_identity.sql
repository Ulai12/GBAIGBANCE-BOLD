-- Only the Edge Function's service-role client can consume quota. The identity
-- is supplied by the trusted server and stored as a one-way digest.
UPDATE public.ai_rate_limits
   SET identifier = encode(extensions.digest('user_' || substring(identifier FROM 6), 'sha256'), 'hex')
 WHERE identifier LIKE 'user\_%';
UPDATE public.ai_rate_limits
   SET identifier = encode(
         extensions.digest('ip_' || encode(extensions.digest(substring(identifier FROM 4), 'sha256'), 'hex'), 'sha256'),
         'hex'
       )
 WHERE identifier LIKE 'ip\_%';

-- Remove the caller-configurable legacy overload (including its defaults) so
-- PostgREST cannot resolve the new RPC ambiguously.
DROP FUNCTION IF EXISTS public.check_and_increment_ai_quota(text, boolean, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
  p_identifier text,
  p_is_authenticated boolean
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id text;
  v_now timestamptz := now();
  v_window integer := 0;
  v_day integer := 0;
  v_limit_window integer := CASE WHEN p_is_authenticated THEN 20 ELSE 5 END;
  v_limit_day integer := CASE WHEN p_is_authenticated THEN 60 ELSE 15 END;
BEGIN
  IF (auth.jwt() ->> 'role') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;
  IF p_identifier IS NULL OR length(p_identifier) > 128 OR
     (p_is_authenticated AND p_identifier NOT LIKE 'user\_%') OR
     (NOT p_is_authenticated AND p_identifier NOT LIKE 'ip\_%') THEN
    RAISE EXCEPTION 'invalid quota identifier';
  END IF;

  v_id := encode(extensions.digest(p_identifier, 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id, 0));
  DELETE FROM public.ai_rate_limits WHERE window_start < v_now - interval '48 hours';

  SELECT COALESCE(sum(request_count) FILTER (WHERE window_start >= v_now - interval '10 minutes'), 0)::int,
         COALESCE(sum(request_count), 0)::int
    INTO v_window, v_day
    FROM public.ai_rate_limits
   WHERE identifier = v_id AND window_start >= v_now - interval '24 hours';

  IF v_window >= v_limit_window OR v_day >= v_limit_day THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', CASE WHEN v_day >= v_limit_day THEN 'daily_limit' ELSE 'window_limit' END,
      'message', CASE WHEN v_day >= v_limit_day THEN 'Plafond journalier atteint.' ELSE 'Trop de messages en peu de temps.' END
    );
  END IF;

  INSERT INTO public.ai_rate_limits(identifier, window_start, request_count)
  VALUES (v_id, v_now, 1);
  RETURN json_build_object(
    'allowed', true,
    'remaining_window', v_limit_window - v_window - 1,
    'remaining_daily', v_limit_day - v_day - 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(text, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(text, boolean) TO service_role;
