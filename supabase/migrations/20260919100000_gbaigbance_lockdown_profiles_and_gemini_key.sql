/*
# GBAIGBANCE — Security Hardening: Lockdown Profiles Table & Sanitize Gemini Config

## Objectives:
1. Drop the legacy permissive policy `profiles_select_public` on `profiles` table.
2. Restrict direct SELECT on `profiles` exclusively to:
   - The user themselves (`auth.uid() = id`)
   - Platform administrators (`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`)
3. Ensure public profile searches and attendee/artist discovery use `public_profiles` view
   (which securely exposes only non-PII fields: id, name, avatar_url, role, city, country, bio, created_at).
4. Strip any legacy API keys that may have been stored in `profiles.gemini_config` column,
   enforcing the strict BYOK rule (API keys must reside strictly on the user's local device).
*/

-- 1. Drop permissive legacy public SELECT policy on profiles if present
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;

-- 2. Ensure RLS is active on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create strict self-or-admin SELECT policy on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles admin_p
    WHERE admin_p.id = auth.uid() AND admin_p.role = 'admin'
  )
);

-- 4. Re-declare public_profiles view without security_invoker to allow safe public querying
-- of public fields without exposing email, phone, or gemini_config
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id, 
  name, 
  avatar_url, 
  role, 
  city, 
  country, 
  bio, 
  created_at
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- 5. Sanitize any API key that might have been persisted in profiles.gemini_config
UPDATE profiles
SET gemini_config = gemini_config - 'apiKey'
WHERE gemini_config ? 'apiKey';
