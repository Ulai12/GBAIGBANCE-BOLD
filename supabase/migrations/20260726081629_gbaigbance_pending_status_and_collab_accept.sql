/*
# Gbaigbance — Statut pending pour événements en attente de validation collaborateurs

## Description
Ajoute le statut 'pending' aux événements pour gérer le cas où des collaborateurs sont invités.
L'événement reste en 'pending' tant que les collaborateurs n'ont pas accepté, puis passe en 'published'.

## Changements
1. Ajout du statut 'pending' dans le CHECK constraint de events.status
2. Mise à jour de la politique SELECT pour que le créateur voie ses événements pending
3. RPC accept_collaboration : quand tous les collaborateurs ont accepté, l'événement passe en published
*/

-- Ajouter 'pending' au statut des événements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_status_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft','pending','published','cancelled','completed'));

-- Mettre à jour la politique SELECT pour que le créateur voie ses événements pending
DROP POLICY IF EXISTS "events_select_public" ON events;
CREATE POLICY "events_select_public" ON events FOR SELECT
  TO anon, authenticated USING (
    status IN ('published')
    OR auth.uid() = organizer_user_id
    OR EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
    )
  );

-- RPC: accept_collaboration
CREATE OR REPLACE FUNCTION accept_collaboration(
  p_collaborator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collab event_collaborators%ROWTYPE;
  v_event_id uuid;
  v_pending_count integer;
BEGIN
  SELECT * INTO v_collab FROM event_collaborators WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable');
  END IF;

  UPDATE event_collaborators SET status = 'accepted' WHERE id = p_collaborator_id;
  v_event_id := v_collab.event_id;

  SELECT COUNT(*) INTO v_pending_count
  FROM event_collaborators
  WHERE event_id = v_event_id AND status = 'pending';

  IF v_pending_count = 0 THEN
    UPDATE events SET status = 'published' WHERE id = v_event_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;
