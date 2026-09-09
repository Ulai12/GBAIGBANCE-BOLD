/*
# GBAIGBANCE — Clean Seed/Mock Data & Persist Gemini Config to User Account

## Objectives:
1. Completely purge fake test events, fake test artists, and fake test organizations from database.
2. Add `gemini_config` column (JSONB) to `profiles` table so users can persist their Gemini API key and AI settings directly to their account across all devices and sessions.
3. Ensure RLS policies allow authenticated users to view and update their own `gemini_config`.
*/

-- 1. Purge fake event artists relations
DELETE FROM event_artists 
WHERE event_id::text LIKE 'e1000000-%' 
   OR artist_id::text LIKE 'b1000000-%';

-- 2. Purge fake tickets created on demo/test events
DELETE FROM tickets 
WHERE event_id::text LIKE 'e1000000-%';

-- 3. Purge fake events
DELETE FROM events 
WHERE id::text LIKE 'e1000000-%' 
   OR title ILIKE '%Afro-Fusion Festival 2025%'
   OR title ILIKE '%Lomé Summer Jam 2025%'
   OR title ILIKE '%Neon Vibe Night%'
   OR title ILIKE '%Jazz at Marina%'
   OR title ILIKE '%Art & Soul Gallery%'
   OR title ILIKE '%Skyline Lounge Session%'
   OR title ILIKE '%TechTogo Summit 2025%'
   OR title ILIKE '%Festival Vodoun Cotonou%';

-- 4. Purge fake artists
DELETE FROM artists 
WHERE id::text LIKE 'b1000000-%'
   OR name IN ('Kafui Mensah', 'Aminata Diallo', 'DJ Eklu', 'Kofi & The Roots', 'Sira Kone', 'Ama Rhythm');

-- 5. Purge fake organizations
DELETE FROM organizations 
WHERE id::text LIKE 'a1000000-%'
   OR name IN ('AfroVibe Events', 'Culture Bénin', 'Grand Place Productions');

-- 6. Add gemini_config column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'gemini_config'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gemini_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
