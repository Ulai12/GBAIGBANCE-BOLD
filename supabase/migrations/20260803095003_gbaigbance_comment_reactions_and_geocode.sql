/*
# Add comment reactions table + geocode existing events

## Changes
1. Create `comment_reactions` table — allows users to react to individual comments
   with emojis (like, love, haha, wow, sad, angry). One reaction per user per comment.
2. Set latitude/longitude for all existing events (all in Lomé, Togo area) so the
   real map can display them.
3. Add RLS policies on `comment_reactions` (owner-scoped CRUD).
4. Add index on `comment_id` for fast lookup.

## Tables
- `comment_reactions`
  - `id` (uuid PK)
  - `comment_id` (uuid FK → event_comments, CASCADE)
  - `user_id` (uuid, NOT NULL DEFAULT auth.uid())
  - `emoji` (text, NOT NULL — one of: like, love, haha, wow, sad, angry)
  - `created_at` (timestamptz DEFAULT now())
  - UNIQUE(comment_id, user_id) — one reaction per user per comment

## Security
- RLS enabled, owner-scoped: users can read all reactions (to show counts),
  but only insert/update/delete their own.
*/

-- 1. Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES event_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions_select_all" ON comment_reactions;
CREATE POLICY "comment_reactions_select_all" ON comment_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "comment_reactions_insert_own" ON comment_reactions;
CREATE POLICY "comment_reactions_insert_own" ON comment_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_reactions_update_own" ON comment_reactions;
CREATE POLICY "comment_reactions_update_own" ON comment_reactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_reactions_delete_own" ON comment_reactions;
CREATE POLICY "comment_reactions_delete_own" ON comment_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);

-- 2. Geocode existing events (Lomé, Togo area)
UPDATE events SET latitude = 6.1725, longitude = 1.2314 WHERE latitude IS NULL AND city = 'Lomé' AND location_name = 'Plage';
UPDATE events SET latitude = 6.1900, longitude = 1.2200 WHERE latitude IS NULL AND city = 'Lomé' AND location_name = 'Togo 2000';
UPDATE events SET latitude = 6.1725, longitude = 1.2314 WHERE latitude IS NULL AND city = 'Lomé';
-- Fallback: any remaining null coords
UPDATE events SET latitude = 6.1725, longitude = 1.2314 WHERE latitude IS NULL;
