-- 20261125130000_consolidate_multiple_permissive_policies.sql
-- Consolide les policies permissives multiples (advisor performance 0006).
-- Rollback : recrer les policies separees si besoin.

-- event_comments DELETE : propre OU organisateur
DROP POLICY IF EXISTS delete_own_event_comments ON public.event_comments;
DROP POLICY IF EXISTS delete_organizer_event_comments ON public.event_comments;
CREATE POLICY delete_event_comments ON public.event_comments
FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_comments.event_id
    AND (
      e.organizer_user_id = (SELECT auth.uid())
      OR e.organizer_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
    )
  )
);

-- event_questions DELETE : propre OU organisateur
DROP POLICY IF EXISTS delete_own_event_questions ON public.event_questions;
DROP POLICY IF EXISTS delete_organizer_event_questions ON public.event_questions;
CREATE POLICY delete_event_questions ON public.event_questions
FOR DELETE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_questions.event_id
    AND (
      e.organizer_user_id = (SELECT auth.uid())
      OR e.organizer_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
    )
  )
);

-- event_questions UPDATE : propre OU organisateur (answer)
DROP POLICY IF EXISTS update_own_event_questions ON public.event_questions;
DROP POLICY IF EXISTS answer_event_questions ON public.event_questions;
CREATE POLICY update_event_questions ON public.event_questions
FOR UPDATE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_questions.event_id
    AND (
      e.organizer_user_id = (SELECT auth.uid())
      OR e.organizer_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_questions.event_id
    AND (
      e.organizer_user_id = (SELECT auth.uid())
      OR e.organizer_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
    )
  )
);
