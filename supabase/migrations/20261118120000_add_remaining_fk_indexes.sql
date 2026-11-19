-- Migration: ajout d'index sur les clés étrangères restantes non indexées (advisors performance)
-- Date: 2026-11-18
-- Rollback en bas

CREATE INDEX IF NOT EXISTS idx_payments_ticket_option_id ON public.payments (ticket_option_id);
CREATE INDEX IF NOT EXISTS idx_ticket_refunds_payment_id ON public.ticket_refunds (payment_id);
CREATE INDEX IF NOT EXISTS idx_ticket_refunds_ticket_id ON public.ticket_refunds (ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_presence_badges_event_id ON public.event_presence_badges (event_id);
CREATE INDEX IF NOT EXISTS idx_event_presence_badges_user_id ON public.event_presence_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON public.event_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON public.artists (user_id);
CREATE INDEX IF NOT EXISTS idx_event_artists_artist_id ON public.event_artists (artist_id);

-- Rollback:
-- DROP INDEX IF EXISTS public.idx_payments_ticket_option_id;
-- DROP INDEX IF EXISTS public.idx_ticket_refunds_payment_id;
-- DROP INDEX IF EXISTS public.idx_ticket_refunds_ticket_id;
-- DROP INDEX IF EXISTS public.idx_event_presence_badges_event_id;
-- DROP INDEX IF EXISTS public.idx_event_presence_badges_user_id;
-- DROP INDEX IF EXISTS public.idx_comment_reactions_user_id;
-- DROP INDEX IF EXISTS public.idx_event_comments_user_id;
-- DROP INDEX IF EXISTS public.idx_notifications_actor_id;
-- DROP INDEX IF EXISTS public.idx_artists_user_id;
-- DROP INDEX IF EXISTS public.idx_event_artists_artist_id;
