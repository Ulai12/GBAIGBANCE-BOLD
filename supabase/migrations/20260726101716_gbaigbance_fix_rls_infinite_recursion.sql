/*
# Fix infinite recursion in events RLS policies

## Problème
La policy SELECT de "events" faisait une sous-requête vers "event_collaborators",
et la policy SELECT de "event_collaborators" faisait une sous-requête vers "events".
Cela crée une boucle infinie dès qu'on essaie d'insérer ou lire un événement.

## Solution
1. Supprimer la référence croisée circulaire.
2. La policy SELECT events utilise maintenant un accès direct sans boucle.
3. La policy SELECT event_collaborators conserve sa logique mais via organizer_user_id direct.
*/

-- 1. DROP + RECREATE events policies (sans sous-requête circulaire)
DROP POLICY IF EXISTS "events_select_public" ON events;
DROP POLICY IF EXISTS "events_insert_auth" ON events;
DROP POLICY IF EXISTS "events_update_own" ON events;
DROP POLICY IF EXISTS "events_delete_own" ON events;

CREATE POLICY "events_select_public" ON events FOR SELECT TO anon, authenticated USING (status = 'published' OR organizer_user_id = auth.uid());
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_user_id);
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = organizer_user_id) WITH CHECK (auth.uid() = organizer_user_id);
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = organizer_user_id);

-- 2. DROP + RECREATE event_collaborators policies
DROP POLICY IF EXISTS "collab_select" ON event_collaborators;
DROP POLICY IF EXISTS "collab_insert_own" ON event_collaborators;
DROP POLICY IF EXISTS "collab_update_own" ON event_collaborators;
DROP POLICY IF EXISTS "collab_delete_own" ON event_collaborators;

CREATE POLICY "collab_select" ON event_collaborators FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_insert_own" ON event_collaborators FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_update_own" ON event_collaborators FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_delete_own" ON event_collaborators FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));

-- 3. Fix ticket_options policies
DROP POLICY IF EXISTS "ticket_options_select" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_insert_own" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_update_own" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_delete_own" ON ticket_options;

CREATE POLICY "ticket_options_select" ON ticket_options FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND (events.status = 'published' OR events.organizer_user_id = auth.uid())));
CREATE POLICY "ticket_options_insert_own" ON ticket_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "ticket_options_update_own" ON ticket_options FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "ticket_options_delete_own" ON ticket_options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
