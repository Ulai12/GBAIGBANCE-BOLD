-- GBAIGBANCE-BOLD: align the deployed notification preferences table with the
-- frontend contract and make create_notification honor those preferences.
-- Social follow notifications share the existing "new_followers" preference.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS new_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comment_replies boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_questions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS question_answered boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_followers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invite_accepted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean := true;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN;
  END IF;

  SELECT CASE
    WHEN p_type IN ('artist_follow', 'organization_follow', 'user_follow', 'new_follower')
      THEN new_followers
    WHEN p_type = 'new_comment' THEN new_comments
    WHEN p_type = 'comment_reply' THEN comment_replies
    WHEN p_type = 'new_question' THEN new_questions
    WHEN p_type = 'question_answered' THEN question_answered
    WHEN p_type IN ('event_invite', 'invite_accepted') THEN invite_accepted
    WHEN p_type = 'event_reminder' THEN event_reminders
    ELSE true
  END
  INTO v_enabled
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- L'absence de préférences signifie que les notifications restent activées par défaut.
  IF NOT COALESCE(v_enabled, true) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id, actor_id, type, title, body, entity_type, entity_id
  )
  VALUES (
    p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  );
END;
$function$;

-- Fonction interne : les clients passent par les RPC de domaine, jamais directement.
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, uuid)
  TO service_role;

-- Rollback: restore the previous create_notification body and drop the seven
-- preference columns only after confirming no application version depends on them.
