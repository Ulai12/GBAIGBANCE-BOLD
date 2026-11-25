-- 20261125124605_prevent_collaboration_reactivation_and_auto_publish.sql
CREATE OR REPLACE FUNCTION public.accept_collaboration(p_collaborator_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_collab public.event_collaborators%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;
  SELECT * INTO v_collab
  FROM public.event_collaborators
  WHERE id = p_collaborator_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invitation introuvable'); END IF;
  IF v_collab.status = 'accepted' THEN
    RETURN json_build_object('success', true, 'already_accepted', true);
  END IF;
  IF v_collab.status IS DISTINCT FROM 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette invitation n’est plus active');
  END IF;
  UPDATE public.event_collaborators
  SET status = 'accepted'
  WHERE id = p_collaborator_id AND user_id = auth.uid() AND status = 'pending';
  RETURN json_build_object('success', true);
END;
$$;
