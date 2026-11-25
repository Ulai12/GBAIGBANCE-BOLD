-- 20261125120841_harden_rls_creator_and_auth_rpc_access.sql
-- Empêche l'auto-attribution du rôle administrateur.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_service boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  caller_is_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' AND NOT caller_is_service AND NOT caller_is_admin THEN
      NEW.role := 'participant';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'admin'
       AND OLD.role IS DISTINCT FROM 'admin'
       AND NOT caller_is_service
       AND NOT caller_is_admin THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Empêche l'auto-vérification des organisations et artistes et la falsification
-- directe de leurs compteurs par un client.
CREATE OR REPLACE FUNCTION public.protect_org_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_service boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  caller_is_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT caller_is_service AND NOT caller_is_admin THEN
      NEW.verification_status := 'pending';
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT caller_is_service AND NOT caller_is_admin THEN
      NEW.verification_status := OLD.verification_status;
    END IF;
    IF NOT caller_is_service THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_verification_status ON public.organizations;
CREATE TRIGGER trg_protect_org_verification_status
BEFORE INSERT OR UPDATE OF verification_status, followers_count, events_count
ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.protect_org_verification_status();

CREATE OR REPLACE FUNCTION public.protect_artist_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_service boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  caller_is_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid();
    END IF;
    IF NOT caller_is_service AND NOT caller_is_admin THEN
      NEW.is_verified := false;
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT caller_is_service AND NOT caller_is_admin THEN
      NEW.is_verified := OLD.is_verified;
    END IF;
    IF NOT caller_is_service THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_artist_verification ON public.artists;
CREATE TRIGGER trg_protect_artist_verification
BEFORE INSERT OR UPDATE OF is_verified, followers_count, events_count
ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.protect_artist_verification();

-- Les liens artiste/événement ne peuvent être modifiés que par le propriétaire
-- de l'événement, un collaborateur accepté ou un administrateur.
DROP POLICY IF EXISTS ea_insert_auth ON public.event_artists;
DROP POLICY IF EXISTS ea_delete_auth ON public.event_artists;

CREATE POLICY ea_insert_auth ON public.event_artists
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_artists.event_id
      AND (
        e.organizer_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.event_collaborators c
          WHERE c.event_id = e.id
            AND c.user_id = (SELECT auth.uid())
            AND c.status = 'accepted'
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
        )
      )
  )
);

CREATE POLICY ea_delete_auth ON public.event_artists
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_artists.event_id
      AND (
        e.organizer_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.event_collaborators c
          WHERE c.event_id = e.id
            AND c.user_id = (SELECT auth.uid())
            AND c.status = 'accepted'
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
        )
      )
  )
);

-- Les fonctions qui exigent une identité ne doivent pas hériter de EXECUTE
-- via PUBLIC. Le rôle authenticated reçoit explicitement l'accès.
REVOKE ALL ON FUNCTION public.accept_collaboration(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_ticket(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_ticket(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_event_report(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.accept_collaboration(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_ticket(uuid, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_ticket(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_event_report(uuid, text, text) TO authenticated, service_role;

-- Les fonctions trigger ne sont pas des RPC publiques.
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_org_verification_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_artist_verification() FROM PUBLIC, anon, authenticated;
