-- 20261125122522_restrict_platform_stats_and_profile_writes.sql
REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO service_role;

-- The deduplicated record_event_view RPC is now the only client-side view counter.
REVOKE ALL ON FUNCTION public.increment_event_views(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_event_views(uuid) TO service_role;

-- RLS remains responsible for per-row authorization; anon has no direct write grants.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
