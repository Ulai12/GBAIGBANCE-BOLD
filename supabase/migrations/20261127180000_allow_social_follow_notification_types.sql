-- GBAIGBANCE-BOLD: allow the social follow notification types emitted by the
-- existing toggle_artist_follow, toggle_organization_follow and toggle_user_follow RPCs.
-- This is additive: all notification types already in use remain valid.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type = ANY (ARRAY[
      'comment_reply',
      'new_comment',
      'new_question',
      'question_answered',
      'new_follower',
      'event_invite',
      'invite_accepted',
      'event_report',
      'artist_follow',
      'organization_follow',
      'user_follow'
    ]::text[])
  );

-- Rollback:
-- ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
--   CHECK (type = ANY (ARRAY[
--     'comment_reply','new_comment','new_question','question_answered',
--     'new_follower','event_invite','invite_accepted','event_report'
--   ]::text[]));
