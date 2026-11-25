-- 20261125121719_lockdown_private_profile_reads.sql
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR public.is_platform_admin()
);

REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;
