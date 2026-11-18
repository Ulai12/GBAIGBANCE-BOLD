-- Migration: drop table example (vide, validée) + optimisation RLS auth initplan sur tables critiques
-- Date: 2026-11-18
-- Objectif: (select auth.uid()) pour éviter la réévaluation par ligne
-- Rollback: voir commentaires en bas (recreate policies + table example si besoin)

-- 1. Drop table example (0 lignes, RLS sans policy)
DROP TABLE IF EXISTS public.example;

-- 2. profiles
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING ((select auth.uid()) = id);

-- 3. tickets
DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS tickets_insert_own ON public.tickets;
CREATE POLICY tickets_insert_own ON public.tickets
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS tickets_update_own ON public.tickets;
CREATE POLICY tickets_update_own ON public.tickets
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS tickets_delete_own ON public.tickets;
CREATE POLICY tickets_delete_own ON public.tickets
  FOR DELETE USING ((select auth.uid()) = user_id);

-- 4. payments
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments
  FOR SELECT USING (buyer_user_id = (select auth.uid()));

-- 5. events
DROP POLICY IF EXISTS events_delete_own ON public.events;
CREATE POLICY events_delete_own ON public.events
  FOR DELETE USING ((select auth.uid()) = organizer_user_id);

DROP POLICY IF EXISTS events_insert_auth ON public.events;
CREATE POLICY events_insert_auth ON public.events
  FOR INSERT WITH CHECK ((select auth.uid()) = organizer_user_id);

DROP POLICY IF EXISTS events_select_public ON public.events;
CREATE POLICY events_select_public ON public.events
  FOR SELECT USING (
    (status = 'published'::text)
    OR ((select auth.uid()) = organizer_user_id)
    OR (EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = (select auth.uid())
    ))
  );

DROP POLICY IF EXISTS events_update_own ON public.events;
CREATE POLICY events_update_own ON public.events
  FOR UPDATE USING (
    ((select auth.uid()) = organizer_user_id)
    OR (EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = (select auth.uid())
        AND event_collaborators.status = 'accepted'::text
    ))
  )
  WITH CHECK (
    ((select auth.uid()) = organizer_user_id)
    OR (EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = (select auth.uid())
        AND event_collaborators.status = 'accepted'::text
    ))
  );

-- 6. ticket_options
DROP POLICY IF EXISTS ticket_options_select ON public.ticket_options;
CREATE POLICY ticket_options_select ON public.ticket_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_options.event_id
        AND (events.status = 'published'::text OR events.organizer_user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS ticket_options_insert_own ON public.ticket_options;
CREATE POLICY ticket_options_insert_own ON public.ticket_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_options.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS ticket_options_update_own ON public.ticket_options;
CREATE POLICY ticket_options_update_own ON public.ticket_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_options.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_options.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS ticket_options_delete_own ON public.ticket_options;
CREATE POLICY ticket_options_delete_own ON public.ticket_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_options.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  );

-- Rollback (si nécessaire) :
-- 1. Recréer public.example si besoin (table de démo vide)
-- 2. Remettre auth.uid() sans select sur les policies ci-dessus (moins performant)
