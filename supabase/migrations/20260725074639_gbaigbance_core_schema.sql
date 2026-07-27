/*
# GBAIGBANCE — Schéma principal

## Description
Crée toutes les tables fondamentales pour la plateforme événementielle africaine Gbaigbance.

## Tables créées
- profiles, organizations, artists, events, event_artists, tickets, event_likes, artist_follows

## Sécurité
- RLS activé sur toutes les tables.
- Policies : lecture publique sur events/artists/organizations, écriture authentifiée propriétaire.
*/

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'organizer', 'artist', 'admin')),
  city text DEFAULT 'Lomé',
  country text DEFAULT 'TG',
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ==================== ORGANIZATIONS ====================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  cover_url text,
  website text,
  phone text,
  email text,
  city text DEFAULT 'Lomé',
  country text DEFAULT 'TG',
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  followers_count integer NOT NULL DEFAULT 0,
  events_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgs_select_public" ON organizations;
CREATE POLICY "orgs_select_public" ON organizations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "orgs_insert_own" ON organizations;
CREATE POLICY "orgs_insert_own" ON organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "orgs_update_own" ON organizations;
CREATE POLICY "orgs_update_own" ON organizations FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "orgs_delete_own" ON organizations;
CREATE POLICY "orgs_delete_own" ON organizations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ==================== ARTISTS ====================
CREATE TABLE IF NOT EXISTS artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  bio text,
  photo_url text,
  cover_url text,
  genres text[] DEFAULT '{}',
  city text DEFAULT 'Lomé',
  country text DEFAULT 'TG',
  instagram_url text,
  twitter_url text,
  youtube_url text,
  spotify_url text,
  followers_count integer NOT NULL DEFAULT 0,
  events_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "artists_select_public" ON artists;
CREATE POLICY "artists_select_public" ON artists FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "artists_insert_auth" ON artists;
CREATE POLICY "artists_insert_auth" ON artists FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "artists_update_own" ON artists;
CREATE POLICY "artists_update_own" ON artists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "artists_delete_own" ON artists;
CREATE POLICY "artists_delete_own" ON artists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== EVENTS ====================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'concert' CHECK (category IN ('concert','festival','conference','formation','exposition','spectacle','cultural','private')),
  cover_url text,
  images text[] DEFAULT '{}',
  location_name text NOT NULL DEFAULT '',
  location_address text,
  city text DEFAULT 'Lomé',
  country text DEFAULT 'TG',
  latitude numeric(10,7),
  longitude numeric(10,7),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  price_min numeric(10,2) NOT NULL DEFAULT 0,
  price_max numeric(10,2),
  currency text NOT NULL DEFAULT 'XOF',
  capacity integer,
  attendees_count integer NOT NULL DEFAULT 0,
  organizer_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  organizer_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
  is_featured boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_category_idx ON events(category);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events(starts_at);
CREATE INDEX IF NOT EXISTS events_city_idx ON events(city);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select_public" ON events;
CREATE POLICY "events_select_public" ON events FOR SELECT TO anon, authenticated USING (status = 'published' OR auth.uid() = organizer_user_id);
DROP POLICY IF EXISTS "events_insert_auth" ON events;
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_user_id);
DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = organizer_user_id) WITH CHECK (auth.uid() = organizer_user_id);
DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = organizer_user_id);

-- ==================== EVENT_ARTISTS ====================
CREATE TABLE IF NOT EXISTS event_artists (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, artist_id)
);
ALTER TABLE event_artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ea_select_public" ON event_artists;
CREATE POLICY "ea_select_public" ON event_artists FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ea_insert_auth" ON event_artists;
CREATE POLICY "ea_insert_auth" ON event_artists FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ea_delete_auth" ON event_artists;
CREATE POLICY "ea_delete_auth" ON event_artists FOR DELETE TO authenticated USING (true);

-- ==================== TICKETS ====================
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type text NOT NULL DEFAULT 'standard' CHECK (ticket_type IN ('free','standard','vip','vvip')),
  price_paid numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  qr_code text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','cancelled','refunded')),
  seat_info text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_event_idx ON tickets(event_id);
CREATE INDEX IF NOT EXISTS tickets_user_idx ON tickets(user_id);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
CREATE POLICY "tickets_select_own" ON tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_insert_own" ON tickets;
CREATE POLICY "tickets_insert_own" ON tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_update_own" ON tickets;
CREATE POLICY "tickets_update_own" ON tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_delete_own" ON tickets;
CREATE POLICY "tickets_delete_own" ON tickets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== EVENT_LIKES ====================
CREATE TABLE IF NOT EXISTS event_likes (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select_public" ON event_likes;
CREATE POLICY "likes_select_public" ON event_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "likes_insert_own" ON event_likes;
CREATE POLICY "likes_insert_own" ON event_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete_own" ON event_likes;
CREATE POLICY "likes_delete_own" ON event_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==================== ARTIST_FOLLOWS ====================
CREATE TABLE IF NOT EXISTS artist_follows (
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (artist_id, user_id)
);
ALTER TABLE artist_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select_public" ON artist_follows;
CREATE POLICY "follows_select_public" ON artist_follows FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "follows_insert_own" ON artist_follows;
CREATE POLICY "follows_insert_own" ON artist_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "follows_delete_own" ON artist_follows;
CREATE POLICY "follows_delete_own" ON artist_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);
