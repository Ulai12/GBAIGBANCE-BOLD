-- Migration: ajout d'index sur clés étrangères non indexées (advisors performance)
-- Date: 2026-11-16
-- Rollback: voir section en bas

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_user_id ON public.events (organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON public.event_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_artist_follows_user_id ON public.artist_follows (user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations (owner_id);

-- Rollback:
-- DROP INDEX IF EXISTS public.idx_events_organizer_id;
-- DROP INDEX IF EXISTS public.idx_events_organizer_user_id;
-- DROP INDEX IF EXISTS public.idx_tickets_user_id;
-- DROP INDEX IF EXISTS public.idx_event_likes_user_id;
-- DROP INDEX IF EXISTS public.idx_artist_follows_user_id;
-- DROP INDEX IF EXISTS public.idx_organizations_owner_id;
