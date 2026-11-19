-- Replace per-row auth.uid() calls in the remaining high-traffic policies.

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (
    id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = (select auth.uid()) AND admin_p.role = 'admin'
    )
  );

-- Organizations
DROP POLICY IF EXISTS "orgs_insert_own" ON public.organizations;
CREATE POLICY "orgs_insert_own" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "orgs_update_own" ON public.organizations;
CREATE POLICY "orgs_update_own" ON public.organizations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "orgs_delete_own" ON public.organizations;
CREATE POLICY "orgs_delete_own" ON public.organizations
  FOR DELETE TO authenticated USING ((select auth.uid()) = owner_id);

-- Artists
DROP POLICY IF EXISTS "artists_insert_auth" ON public.artists;
CREATE POLICY "artists_insert_auth" ON public.artists
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "artists_update_own" ON public.artists;
CREATE POLICY "artists_update_own" ON public.artists
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "artists_delete_own" ON public.artists;
CREATE POLICY "artists_delete_own" ON public.artists
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Likes and follows
DROP POLICY IF EXISTS "likes_insert_own" ON public.event_likes;
CREATE POLICY "likes_insert_own" ON public.event_likes
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "likes_delete_own" ON public.event_likes;
CREATE POLICY "likes_delete_own" ON public.event_likes
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "follows_insert_own" ON public.artist_follows;
CREATE POLICY "follows_insert_own" ON public.artist_follows
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "follows_delete_own" ON public.artist_follows;
CREATE POLICY "follows_delete_own" ON public.artist_follows
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_organization_follows" ON public.organization_follows;
CREATE POLICY "insert_organization_follows" ON public.organization_follows
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_organization_follows" ON public.organization_follows;
CREATE POLICY "delete_organization_follows" ON public.organization_follows
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_user_follow" ON public.user_follows;
CREATE POLICY "insert_own_user_follow" ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "delete_own_user_follow" ON public.user_follows;
CREATE POLICY "delete_own_user_follow" ON public.user_follows
  FOR DELETE TO authenticated USING ((select auth.uid()) = follower_id);

-- Collaborators
DROP POLICY IF EXISTS "collab_select" ON public.event_collaborators;
CREATE POLICY "collab_select" ON public.event_collaborators
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_collaborators.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
    OR event_collaborators.user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "collab_insert_own" ON public.event_collaborators;
CREATE POLICY "collab_insert_own" ON public.event_collaborators
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_collaborators.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "collab_update_own" ON public.event_collaborators;
CREATE POLICY "collab_update_own" ON public.event_collaborators
  FOR UPDATE TO authenticated
  USING (
    event_collaborators.user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_collaborators.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    event_collaborators.user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_collaborators.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "collab_delete_own" ON public.event_collaborators;
CREATE POLICY "collab_delete_own" ON public.event_collaborators
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_collaborators.event_id
        AND events.organizer_user_id = (select auth.uid())
    )
    OR event_collaborators.user_id = (select auth.uid())
  );

-- Event comments, reactions, and questions
DROP POLICY IF EXISTS "insert_event_comments" ON public.event_comments;
CREATE POLICY "insert_event_comments" ON public.event_comments
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_event_comments" ON public.event_comments;
CREATE POLICY "update_event_comments" ON public.event_comments
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_event_comments" ON public.event_comments;
CREATE POLICY "delete_own_event_comments" ON public.event_comments
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_organizer_event_comments" ON public.event_comments;
CREATE POLICY "delete_organizer_event_comments" ON public.event_comments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND (
          e.organizer_user_id = (select auth.uid())
          OR e.organizer_id IN (
            SELECT id FROM public.organizations WHERE owner_id = (select auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "insert_event_reactions" ON public.event_reactions;
CREATE POLICY "insert_event_reactions" ON public.event_reactions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_event_reactions" ON public.event_reactions;
CREATE POLICY "delete_event_reactions" ON public.event_reactions
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_event_questions" ON public.event_questions;
CREATE POLICY "insert_event_questions" ON public.event_questions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_event_questions" ON public.event_questions;
CREATE POLICY "update_own_event_questions" ON public.event_questions
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "answer_event_questions" ON public.event_questions;
CREATE POLICY "answer_event_questions" ON public.event_questions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
        AND (
          e.organizer_user_id = (select auth.uid())
          OR e.organizer_id IN (
            SELECT id FROM public.organizations WHERE owner_id = (select auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
        AND (
          e.organizer_user_id = (select auth.uid())
          OR e.organizer_id IN (
            SELECT id FROM public.organizations WHERE owner_id = (select auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "delete_own_event_questions" ON public.event_questions;
CREATE POLICY "delete_own_event_questions" ON public.event_questions
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_organizer_event_questions" ON public.event_questions;
CREATE POLICY "delete_organizer_event_questions" ON public.event_questions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_questions.event_id
        AND (
          e.organizer_user_id = (select auth.uid())
          OR e.organizer_id IN (
            SELECT id FROM public.organizations WHERE owner_id = (select auth.uid())
          )
        )
    )
  );

-- Notification and preference ownership
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
CREATE POLICY "insert_own_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Event reports
DROP POLICY IF EXISTS "event_reports_insert_own" ON public.event_reports;
CREATE POLICY "event_reports_insert_own" ON public.event_reports
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = reporter_id);

DROP POLICY IF EXISTS "event_reports_select_involved" ON public.event_reports;
CREATE POLICY "event_reports_select_involved" ON public.event_reports
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_reports.event_id
        AND e.organizer_user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "select_own_notif_prefs" ON public.notification_preferences;
CREATE POLICY "select_own_notif_prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_notif_prefs" ON public.notification_preferences;
CREATE POLICY "insert_own_notif_prefs" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_notif_prefs" ON public.notification_preferences;
CREATE POLICY "update_own_notif_prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_notif_prefs" ON public.notification_preferences;
CREATE POLICY "delete_own_notif_prefs" ON public.notification_preferences
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Schedule, livestream, and sponsor ownership
DROP POLICY IF EXISTS "insert_event_schedule" ON public.event_schedule;
CREATE POLICY "insert_event_schedule" ON public.event_schedule
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_schedule.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_event_schedule" ON public.event_schedule;
CREATE POLICY "update_event_schedule" ON public.event_schedule
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_schedule.event_id AND e.organizer_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_schedule.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_event_schedule" ON public.event_schedule;
CREATE POLICY "delete_event_schedule" ON public.event_schedule
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_schedule.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_event_live_links" ON public.event_live_links;
CREATE POLICY "insert_event_live_links" ON public.event_live_links
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_live_links.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_event_live_links" ON public.event_live_links;
CREATE POLICY "update_event_live_links" ON public.event_live_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_live_links.event_id AND e.organizer_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_live_links.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_event_live_links" ON public.event_live_links;
CREATE POLICY "delete_event_live_links" ON public.event_live_links
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_live_links.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_event_sponsors" ON public.event_sponsors;
CREATE POLICY "insert_event_sponsors" ON public.event_sponsors
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_event_sponsors" ON public.event_sponsors;
CREATE POLICY "update_event_sponsors" ON public.event_sponsors
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_event_sponsors" ON public.event_sponsors;
CREATE POLICY "delete_event_sponsors" ON public.event_sponsors
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = (select auth.uid())
    )
  );

-- Event-artist links remain writable only by organizers or accepted collaborators.
DROP POLICY IF EXISTS "ea_insert_auth" ON public.event_artists;
CREATE POLICY "ea_insert_auth" ON public.event_artists
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_artists.event_id
        AND (
          events.organizer_user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.event_collaborators
            WHERE event_collaborators.event_id = events.id
              AND event_collaborators.user_id = (select auth.uid())
              AND event_collaborators.status = 'accepted'
          )
        )
    )
  );

DROP POLICY IF EXISTS "ea_delete_auth" ON public.event_artists;
CREATE POLICY "ea_delete_auth" ON public.event_artists
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_artists.event_id
        AND (
          events.organizer_user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.event_collaborators
            WHERE event_collaborators.event_id = events.id
              AND event_collaborators.user_id = (select auth.uid())
              AND event_collaborators.status = 'accepted'
          )
        )
    )
  );

-- Public ticket visibility remains unchanged for buyers, event owners,
-- accepted collaborators, and administrators.
DROP POLICY IF EXISTS "tickets_select_authorized" ON public.tickets;
CREATE POLICY "tickets_select_authorized" ON public.tickets
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = user_id
    OR (select auth.uid()) = buyer_user_id
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
        AND (
          events.organizer_user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.event_collaborators
            WHERE event_collaborators.event_id = events.id
              AND event_collaborators.user_id = (select auth.uid())
              AND event_collaborators.status = 'accepted'
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "payments_select_authorized" ON public.payments;
CREATE POLICY "payments_select_authorized" ON public.payments
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = buyer_user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payments.event_id AND e.organizer_user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "ticket_refunds_select_authorized" ON public.ticket_refunds;
CREATE POLICY "ticket_refunds_select_authorized" ON public.ticket_refunds
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = requester_user_id
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_refunds.event_id AND e.organizer_user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "presence_badges_select_authorized" ON public.event_presence_badges;
CREATE POLICY "presence_badges_select_authorized" ON public.event_presence_badges
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = user_id
    OR is_public_on_profile = true
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_presence_badges.event_id
        AND e.organizer_user_id = (select auth.uid())
    )
  );

-- Comment reactions
DROP POLICY IF EXISTS "comment_reactions_insert_own" ON public.comment_reactions;
CREATE POLICY "comment_reactions_insert_own" ON public.comment_reactions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "comment_reactions_update_own" ON public.comment_reactions;
CREATE POLICY "comment_reactions_update_own" ON public.comment_reactions
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "comment_reactions_delete_own" ON public.comment_reactions;
CREATE POLICY "comment_reactions_delete_own" ON public.comment_reactions
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Storage object ownership
DROP POLICY IF EXISTS "event_images_auth_update" ON storage.objects;
CREATE POLICY "event_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND owner_id = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_delete" ON storage.objects;
CREATE POLICY "event_images_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND owner_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'avatars' AND owner_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = (select auth.uid())::text);
