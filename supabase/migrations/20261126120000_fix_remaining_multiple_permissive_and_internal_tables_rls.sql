-- 20261126120000_fix_remaining_multiple_permissive_and_internal_tables_rls.sql
-- Consolide les policies permissives multiples restantes (advisor 0006) et ajoute des policies explicites service_role pour les tables internes avec RLS sans policy (advisor 0008).
-- Rollback en commentaires.

-- 1. notification_preferences : suppression de la policy SELECT redondante (la policy * couvre SELECT pour les lignes propres)
DROP POLICY IF EXISTS notification_preferences_select ON public.notification_preferences;

-- Rollback:
-- CREATE POLICY notification_preferences_select ON public.notification_preferences FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 2. event_presence_badges : consolidation pour éviter multiple permissive sur SELECT
DROP POLICY IF EXISTS presence_badges_own ON public.event_presence_badges;
DROP POLICY IF EXISTS presence_badges_select ON public.event_presence_badges;

CREATE POLICY presence_badges_select ON public.event_presence_badges
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY presence_badges_insert ON public.event_presence_badges
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY presence_badges_update ON public.event_presence_badges
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY presence_badges_delete ON public.event_presence_badges
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Rollback pour presence:
-- DROP POLICY IF EXISTS presence_badges_select ON public.event_presence_badges;
-- DROP POLICY IF EXISTS presence_badges_insert ON public.event_presence_badges;
-- DROP POLICY IF EXISTS presence_badges_update ON public.event_presence_badges;
-- DROP POLICY IF EXISTS presence_badges_delete ON public.event_presence_badges;
-- CREATE POLICY presence_badges_own ON public.event_presence_badges FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
-- CREATE POLICY presence_badges_select ON public.event_presence_badges FOR SELECT TO authenticated, anon USING (true);

-- 3. Tables internes avec RLS activée mais sans policies : ajout explicite service_role only
CREATE POLICY "service_role_all" ON public.ai_rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all" ON public.ticket_presence_challenges
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Rollback:
-- DROP POLICY IF EXISTS "service_role_all" ON public.ai_rate_limits;
-- DROP POLICY IF EXISTS "service_role_all" ON public.ticket_presence_challenges;
