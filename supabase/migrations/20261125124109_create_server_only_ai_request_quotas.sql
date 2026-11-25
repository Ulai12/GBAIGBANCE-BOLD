-- 20261125124109_create_server_only_ai_request_quotas.sql
-- Idempotent duplicate migration entry; this version reasserts the same server-only quota schema.
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_rate_limits_identifier_window_idx ON public.ai_rate_limits(identifier, window_start);
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_rate_limits FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(p_identifier text,p_is_authenticated boolean)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id text; v_now timestamptz := now(); v_window integer := 0; v_day integer := 0;
  v_limit_window integer := CASE WHEN p_is_authenticated THEN 20 ELSE 5 END;
  v_limit_day integer := CASE WHEN p_is_authenticated THEN 60 ELSE 15 END;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required'; END IF;
  IF p_identifier IS NULL OR length(p_identifier)>128 OR
     (p_is_authenticated IS TRUE AND p_identifier !~ '^user_[0-9a-fA-F-]{36}$') OR
     (p_is_authenticated IS FALSE AND p_identifier !~ '^ip_[0-9a-f]{64}$') OR p_is_authenticated IS NULL
  THEN RAISE EXCEPTION 'invalid quota identifier'; END IF;
  v_id := encode(extensions.digest(p_identifier,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id,0));
  DELETE FROM public.ai_rate_limits WHERE window_start < v_now - interval '48 hours';
  SELECT COALESCE(sum(request_count) FILTER (WHERE window_start >= v_now - interval '10 minutes'),0)::int,
         COALESCE(sum(request_count),0)::int INTO v_window,v_day
  FROM public.ai_rate_limits WHERE identifier=v_id AND window_start >= v_now - interval '24 hours';
  IF v_window>=v_limit_window OR v_day>=v_limit_day THEN
    RETURN json_build_object('allowed',false,'reason',CASE WHEN v_day>=v_limit_day THEN 'daily_limit' ELSE 'window_limit' END,
      'message',CASE WHEN v_day>=v_limit_day THEN CASE WHEN p_is_authenticated THEN 'Plafond journalier atteint (60 messages).' ELSE 'Limite invité atteinte pour aujourd’hui. Connectez-vous pour continuer.' END
      ELSE CASE WHEN p_is_authenticated THEN 'Trop de messages en peu de temps. Veuillez patienter.' ELSE 'Limite invité atteinte. Connectez-vous pour continuer.' END END);
  END IF;
  INSERT INTO public.ai_rate_limits(identifier,window_start,request_count) VALUES(v_id,v_now,1);
  RETURN json_build_object('allowed',true,'remaining_window',v_limit_window-v_window-1,'remaining_daily',v_limit_day-v_day-1);
END;
$$;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(text,boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(text,boolean) TO service_role;
