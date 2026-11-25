-- 20261125122000_replace_public_profiles_view_with_rls_table.sql
-- Remplace la vue SECURITY DEFINER par une projection stockée protégée par RLS.
DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  avatar_url text,
  cover_url text,
  role text,
  city text,
  country text,
  bio text,
  preferred_genres text[],
  created_at timestamptz,
  updated_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

CREATE POLICY public_profiles_select_public ON public.public_profiles
FOR SELECT TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_profile_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_profiles (
    id, name, avatar_url, cover_url, role, city, country, bio,
    preferred_genres, created_at, updated_at, is_demo
  ) VALUES (
    NEW.id, NEW.name, NEW.avatar_url, NEW.cover_url, NEW.role, NEW.city,
    NEW.country, NEW.bio, NEW.preferred_genres, NEW.created_at, NEW.updated_at,
    (
      lower(COALESCE(NEW.email, '')) LIKE '%testuser@%'
      OR lower(COALESCE(NEW.email, '')) LIKE '%example.com%'
      OR lower(COALESCE(NEW.email, '')) LIKE '%test@%'
      OR lower(COALESCE(NEW.email, '')) = 'test@gbaigbance.com'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    cover_url = EXCLUDED.cover_url,
    role = EXCLUDED.role,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    bio = EXCLUDED.bio,
    preferred_genres = EXCLUDED.preferred_genres,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    is_demo = EXCLUDED.is_demo;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_public_profile_projection() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_public_profile_projection ON public.profiles;
CREATE TRIGGER trg_sync_public_profile_projection
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile_projection();

INSERT INTO public.public_profiles (
  id, name, avatar_url, cover_url, role, city, country, bio,
  preferred_genres, created_at, updated_at, is_demo
)
SELECT
  p.id, p.name, p.avatar_url, p.cover_url, p.role, p.city, p.country, p.bio,
  p.preferred_genres, p.created_at, p.updated_at,
  (
    lower(COALESCE(p.email, '')) LIKE '%testuser@%'
    OR lower(COALESCE(p.email, '')) LIKE '%example.com%'
    OR lower(COALESCE(p.email, '')) LIKE '%test@%'
    OR lower(COALESCE(p.email, '')) = 'test@gbaigbance.com'
  )
FROM public.profiles p
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  cover_url = EXCLUDED.cover_url,
  role = EXCLUDED.role,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  bio = EXCLUDED.bio,
  preferred_genres = EXCLUDED.preferred_genres,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  is_demo = EXCLUDED.is_demo;
