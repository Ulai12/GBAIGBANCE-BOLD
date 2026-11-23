-- Migration: add indexes on remaining unindexed foreign keys
-- Advisors performance: 7 unindexed FKs remaining after previous lots
-- Date: 2026-11-20

CREATE INDEX IF NOT EXISTS idx_event_collaborators_invited_by ON public.event_collaborators (invited_by);
CREATE INDEX IF NOT EXISTS idx_event_questions_answered_by ON public.event_questions (answered_by);
CREATE INDEX IF NOT EXISTS idx_event_questions_user_id ON public.event_questions (user_id);
CREATE INDEX IF NOT EXISTS idx_event_reactions_user_id ON public.event_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_event_reports_reporter_id ON public.event_reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_event_schedule_artist_id ON public.event_schedule (artist_id);
CREATE INDEX IF NOT EXISTS idx_organization_follows_user_id ON public.organization_follows (user_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_event_collaborators_invited_by;
-- DROP INDEX IF EXISTS idx_event_questions_answered_by;
-- DROP INDEX IF EXISTS idx_event_questions_user_id;
-- DROP INDEX IF EXISTS idx_event_reactions_user_id;
-- DROP INDEX IF EXISTS idx_event_reports_reporter_id;
-- DROP INDEX IF EXISTS idx_event_schedule_artist_id;
-- DROP INDEX IF EXISTS idx_organization_follows_user_id;
