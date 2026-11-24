-- Migration: 20261124130000_revoke_execute_internal_security_definer
-- Date: 2026-11-24
-- Objectif: empêcher les appels RPC anonymes et authentifiés sur des fonctions internes
-- ou de trigger SECURITY DEFINER qui ne doivent pas être exposées via PostgREST.
--
-- Fonctions concernées :
--   - increment_likes_count / decrement_likes_count : helpers internes de toggle_event_like
--   - update_event_price_range : fonction trigger
--   - rls_auto_enable : fonction event trigger
--   - create_notification : création de notifications (appelée par d'autres fonctions/triggers)
--
-- Les triggers et les autres fonctions SECURITY DEFINER continuent de pouvoir les appeler
-- (elles s'exécutent avec les privilèges du propriétaire).
-- service_role conserve l'EXECUTE.

REVOKE EXECUTE ON FUNCTION public.increment_likes_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_likes_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_event_price_range() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.increment_likes_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_likes_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_event_price_range() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid) TO service_role;

-- Rollback (si nécessaire) :
-- GRANT EXECUTE ON FUNCTION public.increment_likes_count(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.decrement_likes_count(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.update_event_price_range() TO PUBLIC, authenticated;
-- GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC, authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid) TO PUBLIC, authenticated;
