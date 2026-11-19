-- Révoque l'exécution par anon des fonctions SECURITY DEFINER sensibles
-- Appliqué le 2026-11-16 (validation propriétaire)

REVOKE EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_collaboration(uuid) FROM anon;

-- Rollback:
-- GRANT EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) TO anon;
-- etc.
