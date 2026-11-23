-- 20261123010000_fix_event_view_daily_rls_and_duplicate_index.sql
-- Fixes advisor warning: RLS enabled with no policy on internal table event_view_daily.
-- Table is only accessed by SECURITY DEFINER function record_event_view (runs as postgres)
-- and service_role. Grants already revoked from anon/authenticated.
--
-- Rollback:
-- DROP POLICY IF EXISTS "service_role_manage_event_view_daily" ON public.event_view_daily;
-- CREATE INDEX IF NOT EXISTS tickets_user_idx ON public.tickets (user_id);

CREATE POLICY "service_role_manage_event_view_daily"
ON public.event_view_daily
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Drop duplicate index (identical to idx_tickets_user_id)
DROP INDEX IF EXISTS public.tickets_user_idx;
