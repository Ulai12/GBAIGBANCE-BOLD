-- 20261125121350_create_safe_public_profiles_view.sql
-- Vue publique limitée aux données de présentation, sans email, téléphone ni secret.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.cover_url,
  p.role,
  p.city,
  p.country,
  p.bio,
  p.preferred_genres,
  p.created_at,
  p.updated_at,
  (
    lower(COALESCE(p.email, '')) LIKE '%testuser@%'
    OR lower(COALESCE(p.email, '')) LIKE '%example.com%'
    OR lower(COALESCE(p.email, '')) LIKE '%test@%'
    OR lower(COALESCE(p.email, '')) = 'test@gbaigbance.com'
  ) AS is_demo
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
