-- Révoque EXECUTE de anon sur les fonctions SECURITY DEFINER qui exigent une authentification
-- ou sont internes. Les fonctions vérifient déjà auth.uid(), mais l'exposition via RPC est inutile.
-- Fonctions publiques conservées : get_platform_stats, increment_event_views, record_event_view.
-- Appliqué le 2026-11-23.

REVOKE EXECUTE ON FUNCTION public.accept_collaboration(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_ticket_by_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_presence_challenge(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_ticket_payment(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_likes_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.initiate_ticket_payment(uuid, uuid, integer, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_tickets_multi(uuid, uuid, jsonb, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_claim_link(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_ticket_refund(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_refund(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_event_report(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_artist_follow(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_event_like(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_organization_follow(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_user_follow(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_event_price_range() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_likes_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_event_attendees(uuid) FROM anon;

-- Rollback (si nécessaire) :
-- GRANT EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) TO anon;
-- (répéter pour chaque fonction)
