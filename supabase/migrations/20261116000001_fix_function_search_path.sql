-- Fix search_path mutable (advisors sécurité)
-- Appliqué le 2026-11-16

ALTER FUNCTION public.book_ticket(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.cancel_ticket(uuid) SET search_path = public;
ALTER FUNCTION public.accept_collaboration(uuid) SET search_path = public;
ALTER FUNCTION public.update_event_price_range() SET search_path = public;

-- Rollback:
-- ALTER FUNCTION public.book_ticket(uuid, uuid, integer) RESET search_path;
-- etc.
