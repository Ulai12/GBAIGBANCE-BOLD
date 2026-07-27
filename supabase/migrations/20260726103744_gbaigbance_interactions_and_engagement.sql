/*
# Gbaigbance — Interactions & Engagement System

This migration adds social interaction features:
  1. Event comments 2. Event reactions 3. Organization follows 4. Event Q&A

## Security
- RLS enabled on all new tables. Owner-scoped for writes. SELECT open to authenticated.
*/

-- ── EVENT COMMENTS ──
CREATE TABLE IF NOT EXISTS event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES event_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_organizer_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_id ON event_comments(parent_id);
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_comments" ON event_comments;
CREATE POLICY "select_event_comments" ON event_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_comments" ON event_comments;
CREATE POLICY "insert_event_comments" ON event_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_event_comments" ON event_comments;
CREATE POLICY "update_event_comments" ON event_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_event_comments" ON event_comments;
CREATE POLICY "delete_own_event_comments" ON event_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_organizer_event_comments" ON event_comments;
CREATE POLICY "delete_organizer_event_comments" ON event_comments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_comments.event_id AND (e.organizer_user_id = auth.uid() OR e.organizer_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))));

-- ── EVENT REACTIONS ──
CREATE TABLE IF NOT EXISTS event_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_event_reactions_event_id ON event_reactions(event_id, emoji);
ALTER TABLE event_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_reactions" ON event_reactions;
CREATE POLICY "select_event_reactions" ON event_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_reactions" ON event_reactions;
CREATE POLICY "insert_event_reactions" ON event_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_event_reactions" ON event_reactions;
CREATE POLICY "delete_event_reactions" ON event_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── ORGANIZATION FOLLOWS ──
CREATE TABLE IF NOT EXISTS organization_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE organization_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_organization_follows" ON organization_follows;
CREATE POLICY "select_organization_follows" ON organization_follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_organization_follows" ON organization_follows;
CREATE POLICY "insert_organization_follows" ON organization_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_organization_follows" ON organization_follows;
CREATE POLICY "delete_organization_follows" ON organization_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── EVENT QUESTIONS (Q&A) ──
CREATE TABLE IF NOT EXISTS event_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_questions_event_id ON event_questions(event_id, created_at);
ALTER TABLE event_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_questions" ON event_questions;
CREATE POLICY "select_event_questions" ON event_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_questions" ON event_questions;
CREATE POLICY "insert_event_questions" ON event_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_event_questions" ON event_questions;
CREATE POLICY "update_own_event_questions" ON event_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "answer_event_questions" ON event_questions;
CREATE POLICY "answer_event_questions" ON event_questions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_questions.event_id AND (e.organizer_user_id = auth.uid() OR e.organizer_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_questions.event_id AND (e.organizer_user_id = auth.uid() OR e.organizer_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))));
DROP POLICY IF EXISTS "delete_own_event_questions" ON event_questions;
CREATE POLICY "delete_own_event_questions" ON event_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_organizer_event_questions" ON event_questions;
CREATE POLICY "delete_organizer_event_questions" ON event_questions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_questions.event_id AND (e.organizer_user_id = auth.uid() OR e.organizer_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))));
