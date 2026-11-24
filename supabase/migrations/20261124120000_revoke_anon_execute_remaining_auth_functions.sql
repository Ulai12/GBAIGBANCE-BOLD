-- Migration: 20261124120000_revoke_anon_execute_remaining_auth_functions
-- Revoke EXECUTE from anon on functions that require authentication or are internal.
-- Applied on Supabase project lwwiolbofrqakvrdvbbj.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO anon; for each.

REVOKE EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_collaboration(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_event_report(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_event_price_range() FROM anon;
