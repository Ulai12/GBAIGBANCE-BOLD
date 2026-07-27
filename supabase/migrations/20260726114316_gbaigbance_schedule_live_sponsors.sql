/*
# Gbaigbance — Multi-day Schedule, Live Links & Sponsors

This migration adds three new capabilities:
1. Multi-day schedule (line-up) — structured programme by day and time slot
2. Live links — external stream links with is_live flag
3. Sponsors — event sponsors with tier and logo

## Security
- RLS enabled on all new tables. SELECT open to authenticated. Writes restricted to event organizer.
*/

-- ── EVENT SCHEDULE (multi-day line-up) ──
CREATE TABLE IF NOT EXISTS event_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artists(id) ON DELETE SET NULL,
  day_label text NOT NULL DEFAULT 'Jour 1',
  stage_name text NOT NULL DEFAULT 'Scène principale',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_schedule_event_id ON event_schedule(event_id, start_time);
ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_schedule" ON event_schedule;
CREATE POLICY "select_event_schedule" ON event_schedule FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_schedule" ON event_schedule;
CREATE POLICY "insert_event_schedule" ON event_schedule FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_schedule.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "update_event_schedule" ON event_schedule;
CREATE POLICY "update_event_schedule" ON event_schedule FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_schedule.event_id AND e.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_schedule.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_event_schedule" ON event_schedule;
CREATE POLICY "delete_event_schedule" ON event_schedule FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_schedule.event_id AND e.organizer_user_id = auth.uid()));

-- ── EVENT LIVE LINKS ──
CREATE TABLE IF NOT EXISTS event_live_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'YouTube',
  url text NOT NULL,
  title text,
  is_live boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_live_links_event_id ON event_live_links(event_id);
ALTER TABLE event_live_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_live_links" ON event_live_links;
CREATE POLICY "select_event_live_links" ON event_live_links FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_live_links" ON event_live_links;
CREATE POLICY "insert_event_live_links" ON event_live_links FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_live_links.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "update_event_live_links" ON event_live_links;
CREATE POLICY "update_event_live_links" ON event_live_links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_live_links.event_id AND e.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_live_links.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_event_live_links" ON event_live_links;
CREATE POLICY "delete_event_live_links" ON event_live_links FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_live_links.event_id AND e.organizer_user_id = auth.uid()));

-- ── EVENT SPONSORS ──
CREATE TABLE IF NOT EXISTS event_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier text NOT NULL DEFAULT 'partner',
  logo_source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_id ON event_sponsors(event_id, tier);
ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_event_sponsors" ON event_sponsors;
CREATE POLICY "select_event_sponsors" ON event_sponsors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_event_sponsors" ON event_sponsors;
CREATE POLICY "insert_event_sponsors" ON event_sponsors FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "update_event_sponsors" ON event_sponsors;
CREATE POLICY "update_event_sponsors" ON event_sponsors FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_event_sponsors" ON event_sponsors;
CREATE POLICY "delete_event_sponsors" ON event_sponsors FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_sponsors.event_id AND e.organizer_user_id = auth.uid()));
