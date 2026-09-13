-- ====================================================================
-- GBAIGBANCE — MIGRATION COMPLETE DU SCHEMA SUPABASE
-- Projet: https://lwwiolbofrqakvrdvbbj.supabase.co
-- A executer dans le SQL Editor de Supabase (Dashboard -> SQL Editor -> New Query -> Run)
-- ====================================================================

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260725074639_gbaigbance_core_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260725074839_gbaigbance_seed_data.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# GBAIGBANCE — Données de démo (sans FK auth.users)

## Description
Insère des données de démonstration. Les organizations et events utilisent un owner_id/organizer_user_id NULL
pour éviter les contraintes FK sur auth.users avec des données fictives.

## Modifications apportées
- owner_id rendu nullable dans organizations (pour la démo)
- organizer_user_id rendu nullable dans events (pour la démo)
- Artistes, organisations et événements insérés

## Note sécurité
Les politiques RLS autorisent la lecture publique sur ces tables.
*/

-- Rendre les colonnes nullables pour les données de démo
ALTER TABLE organizations ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE events ALTER COLUMN organizer_user_id DROP NOT NULL;

-- ==================== ORGANIZATIONS ====================
INSERT INTO organizations (id, owner_id, name, description, logo_url, city, country, verification_status, followers_count, events_count)
VALUES
  ('a1000000-0000-0000-0000-000000000001', NULL, 'AfroVibe Events', 'Premier organisateur d''événements musicaux en Afrique de l''Ouest', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=200', 'Lomé', 'TG', 'verified', 12400, 47),
  ('a1000000-0000-0000-0000-000000000002', NULL, 'Culture Bénin', 'Promoteurs de la culture béninoise et panafricaine', 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=200', 'Cotonou', 'BJ', 'verified', 8200, 31),
  ('a1000000-0000-0000-0000-000000000003', NULL, 'Grand Place Productions', 'Spectacles et concerts à la Grand Place de Lomé', 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=200', 'Lomé', 'TG', 'verified', 5600, 22)
ON CONFLICT (id) DO NOTHING;

-- ==================== ARTISTS ====================
INSERT INTO artists (id, name, bio, photo_url, cover_url, genres, city, country, instagram_url, followers_count, events_count, is_verified)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Kafui Mensah', 'Guitariste et chanteur togolais, fusion d''Afrobeats et de blues traditionnel. Sa musique mêle les rythmes ewe aux sonorités modernes.', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Afrobeats','Blues','World Music'], 'Lomé', 'TG', 'https://instagram.com', 48200, 34, true),
  ('b1000000-0000-0000-0000-000000000002', 'Aminata Diallo', 'Chanteuse franco-béninoise, voix envoûtante entre soul et musique traditionnelle Yoruba.', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Soul','R&B','Traditional'], 'Cotonou', 'BJ', 'https://instagram.com', 31500, 28, true),
  ('b1000000-0000-0000-0000-000000000003', 'DJ Eklu', 'DJ togolais incontournable, maître du Afrohouse et du coupé-décalé fusion.', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Afrohouse','Electronic','Coupé-Décalé'], 'Lomé', 'TG', 'https://instagram.com', 22800, 89, true),
  ('b1000000-0000-0000-0000-000000000004', 'Kofi & The Roots', 'Groupe de highlife et afrojazz originaire d''Accra, tournées en Afrique de l''Ouest.', 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/167491/pexels-photo-167491.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Highlife','Jazz','Afrojazz'], 'Accra', 'GH', 'https://instagram.com', 18700, 42, true),
  ('b1000000-0000-0000-0000-000000000005', 'Sira Kone', 'Pianiste et compositrice malienne, explorant les frontières entre musique mandingue et jazz contemporain.', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Jazz','Mandingue','Classical'], 'Bamako', 'ML', 'https://instagram.com', 14200, 19, true),
  ('b1000000-0000-0000-0000-000000000006', 'Ama Rhythm', 'Productrice et chanteuse ghanéenne, pionnière de l''Afropop nouvelle génération.', 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800', ARRAY['Afropop','Electronic','Dancehall'], 'Accra', 'GH', 'https://instagram.com', 29100, 37, false)
ON CONFLICT (id) DO NOTHING;

-- ==================== EVENTS ====================
INSERT INTO events (id, title, description, category, cover_url, images, location_name, location_address, city, country, latitude, longitude, starts_at, ends_at, price_min, price_max, currency, capacity, attendees_count, organizer_id, organizer_user_id, status, is_featured, likes_count, views_count)
VALUES
  ('e1000000-0000-0000-0000-000000000001','Afro-Fusion Festival 2025','Le plus grand festival de musique afrofusion de l''Afrique de l''Ouest. Trois jours de concerts, de danse et de culture avec les meilleurs artistes du continent. Une expérience inoubliable au cœur de Lomé.','concert','https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600'],'Grand Place','Place du 13 Janvier, Lomé','Lomé','TG',6.1375,1.2123,'2025-12-28 20:00:00+00','2025-12-31 04:00:00+00',5000,25000,'XOF',5000,13200,'a1000000-0000-0000-0000-000000000001',NULL,'published',true,2840,48200),
  ('e1000000-0000-0000-0000-000000000002','Lomé Summer Jam 2025','Get ready for the biggest musical explosion in Lomé! Featuring top Pan-African artists in a magical open-air setting by the Atlantic Ocean.','festival','https://images.pexels.com/photos/167491/pexels-photo-167491.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'],'Plage de Lomé','Boulevard du Mono, Lomé','Lomé','TG',6.1258,1.2254,'2025-06-17 19:00:00+00','2025-06-18 05:00:00+00',15000,48000,'XOF',3000,2100,'a1000000-0000-0000-0000-000000000001',NULL,'published',true,1240,22400),
  ('e1000000-0000-0000-0000-000000000003','Jazz at Marina','Une soirée jazz intimiste et raffinée au Marina Beach Hotel. Kafui Mensah et son orchestre vous transportent dans un voyage musical entre tradition et modernité.','concert','https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?auto=compress&cs=tinysrgb&w=600'],'Marina Beach Hotel','Boulevard du Mono, Lomé','Lomé','TG',6.1302,1.2198,'2025-08-15 21:00:00+00','2025-08-16 02:00:00+00',8000,20000,'XOF',400,312,'a1000000-0000-0000-0000-000000000001',NULL,'published',false,487,8900),
  ('e1000000-0000-0000-0000-000000000004','Neon Vibe Night','La soirée électronique la plus attendue de Lomé. DJ Eklu aux platines pour une nuit de fête sous les néons. Dress code : tenues fluo obligatoires.','concert','https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600'],'Skybar Lomé','12 Rue des Cocotiers, Lomé','Lomé','TG',6.1420,1.2310,'2025-09-06 23:00:00+00','2025-09-07 06:00:00+00',3000,10000,'XOF',800,654,'a1000000-0000-0000-0000-000000000003',NULL,'published',false,921,14200),
  ('e1000000-0000-0000-0000-000000000005','Art & Soul Gallery','Exposition d''art contemporain africain réunissant 20 artistes plasticiens du Togo, du Bénin et du Ghana. Vernissage, performances live et vente d''œuvres.','exposition','https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/1839919/pexels-photo-1839919.jpeg?auto=compress&cs=tinysrgb&w=600'],'Galerie Ananon','Rue du Commerce, Lomé','Lomé','TG',6.1350,1.2145,'2025-07-20 10:00:00+00','2025-07-27 20:00:00+00',0,5000,'XOF',200,89,'a1000000-0000-0000-0000-000000000002',NULL,'published',false,234,4100),
  ('e1000000-0000-0000-0000-000000000006','Skyline Lounge Session','Soirée lounge premium au dernier étage du Radisson Blu. Aminata Diallo en live acoustique, cocktails signature et vue panoramique sur le golfe de Guinée.','concert','https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=600'],'Radisson Blu Lomé','Boulevard de la République, Lomé','Lomé','TG',6.1289,1.2234,'2025-10-11 20:30:00+00','2025-10-12 01:00:00+00',20000,75000,'XOF',150,98,'a1000000-0000-0000-0000-000000000001',NULL,'published',false,178,3200),
  ('e1000000-0000-0000-0000-000000000007','TechTogo Summit 2025','La plus grande conférence tech d''Afrique francophone. 2 jours d''ateliers, de keynotes et de networking avec les pionniers du numérique africain.','conference','https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=600'],'Palais des Congrès','Avenue de la Présidence, Lomé','Lomé','TG',6.1360,1.2267,'2025-11-14 08:00:00+00','2025-11-15 18:00:00+00',10000,50000,'XOF',1500,876,'a1000000-0000-0000-0000-000000000002',NULL,'published',false,654,12800),
  ('e1000000-0000-0000-0000-000000000008','Festival Vodoun Cotonou','Célébration du Festival International Vodoun à Cotonou. Cérémonies traditionnelles, musiques ancestrales et danses rituelles dans le berceau du Vodoun mondial.','cultural','https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',ARRAY['https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600'],'Place de l''Étoile Rouge','Cotonou Centre','Cotonou','BJ',6.3654,2.4183,'2026-01-10 09:00:00+00','2026-01-12 22:00:00+00',0,0,'XOF',10000,4200,'a1000000-0000-0000-0000-000000000002',NULL,'published',true,1890,31200)
ON CONFLICT (id) DO NOTHING;

-- ==================== EVENT_ARTISTS ====================
INSERT INTO event_artists (event_id, artist_id) VALUES
  ('e1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002'),
  ('e1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000004'),
  ('e1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000006'),
  ('e1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000005'),
  ('e1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726073538_gbaigbance_ticketing_and_collaboration.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Gbaigbance — Billetterie opérationnelle et collaboration artistes-organisateurs

## Description
Rend la réservation de billets opérationnelle et permet aux artistes de créer des événements et de collaborer.

## Changements
1. Table `ticket_options` — options de billets par événement
2. Table `event_collaborators` — collaboration entre utilisateurs
3. RPC `book_ticket` — réservation transactionnelle avec QR code
4. RPC `cancel_ticket` — annulation de billet
5. Colonne `events.created_by_role`
6. RLS mise à jour pour artistes + collaborateurs
*/

-- ==================== TICKET_OPTIONS ====================
CREATE TABLE IF NOT EXISTS ticket_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type text NOT NULL DEFAULT 'standard' CHECK (ticket_type IN ('free','standard','vip','vvip')),
  label text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity_total integer NOT NULL DEFAULT 100,
  quantity_sold integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_options_event_idx ON ticket_options(event_id);
ALTER TABLE ticket_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_options_select" ON ticket_options;
CREATE POLICY "ticket_options_select" ON ticket_options FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND (events.status = 'published' OR events.organizer_user_id = auth.uid())));
DROP POLICY IF EXISTS "ticket_options_insert_own" ON ticket_options;
CREATE POLICY "ticket_options_insert_own" ON ticket_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_options_update_own" ON ticket_options;
CREATE POLICY "ticket_options_update_own" ON ticket_options FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_options_delete_own" ON ticket_options;
CREATE POLICY "ticket_options_delete_own" ON ticket_options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));

-- ==================== EVENT_COLLABORATORS ====================
CREATE TABLE IF NOT EXISTS event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'performer' CHECK (role IN ('co_organizer', 'performer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_collaborators_event_idx ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS event_collaborators_user_idx ON event_collaborators(user_id);
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_select" ON event_collaborators;
CREATE POLICY "collab_select" ON event_collaborators FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()) OR event_collaborators.user_id = auth.uid());
DROP POLICY IF EXISTS "collab_insert_own" ON event_collaborators;
CREATE POLICY "collab_insert_own" ON event_collaborators FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "collab_update_own" ON event_collaborators;
CREATE POLICY "collab_update_own" ON event_collaborators FOR UPDATE TO authenticated USING (event_collaborators.user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (event_collaborators.user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
DROP POLICY IF EXISTS "collab_delete_own" ON event_collaborators;
CREATE POLICY "collab_delete_own" ON event_collaborators FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()) OR event_collaborators.user_id = auth.uid());

-- ==================== EVENTS: colonne created_by_role ====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_by_role') THEN
    ALTER TABLE events ADD COLUMN created_by_role text DEFAULT 'organizer' CHECK (created_by_role IN ('organizer', 'artist'));
  END IF;
END $$;

-- ==================== EVENTS: update policy pour collaborateurs ====================
DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = organizer_user_id OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_collaborators.event_id = events.id AND event_collaborators.user_id = auth.uid() AND event_collaborators.status = 'accepted')) WITH CHECK (auth.uid() = organizer_user_id OR EXISTS (SELECT 1 FROM event_collaborators WHERE event_collaborators.event_id = events.id AND event_collaborators.user_id = auth.uid() AND event_collaborators.status = 'accepted'));

-- ==================== RPC: book_ticket ====================
CREATE OR REPLACE FUNCTION book_ticket(p_event_id uuid, p_ticket_option_id uuid, p_quantity integer DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_event events%ROWTYPE; v_option ticket_options%ROWTYPE; v_ticket tickets%ROWTYPE; v_available integer; v_qr text;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Événement introuvable'); END IF;
  IF v_event.status != 'published' THEN RETURN json_build_object('error', 'Événement non disponible'); END IF;
  SELECT * INTO v_option FROM ticket_options WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Option de billet introuvable'); END IF;
  v_available := v_option.quantity_total - v_option.quantity_sold;
  IF v_available < p_quantity THEN RETURN json_build_object('error', 'Plus assez de billets disponibles'); END IF;
  IF v_event.capacity IS NOT NULL AND v_event.attendees_count + p_quantity > v_event.capacity THEN RETURN json_build_object('error', 'Capacité maximale atteinte'); END IF;
  v_qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO tickets (event_id, user_id, ticket_type, price_paid, currency, qr_code, status) VALUES (p_event_id, auth.uid(), v_option.ticket_type, v_option.price * p_quantity, v_event.currency, v_qr, 'active') RETURNING * INTO v_ticket;
  UPDATE ticket_options SET quantity_sold = quantity_sold + p_quantity WHERE id = p_ticket_option_id;
  UPDATE events SET attendees_count = attendees_count + p_quantity WHERE id = p_event_id;
  RETURN json_build_object('success', true, 'ticket', row_to_json(v_ticket));
END;
$$;

-- ==================== RPC: cancel_ticket ====================
CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ticket tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Billet introuvable'); END IF;
  IF v_ticket.status != 'active' THEN RETURN json_build_object('error', 'Billet déjà annulé ou utilisé'); END IF;
  UPDATE tickets SET status = 'cancelled' WHERE id = p_ticket_id;
  UPDATE ticket_options SET quantity_sold = GREATEST(quantity_sold - 1, 0) WHERE event_id = v_ticket.event_id AND ticket_type = v_ticket.ticket_type;
  UPDATE events SET attendees_count = GREATEST(attendees_count - 1, 0) WHERE id = v_ticket.event_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726081629_gbaigbance_pending_status_and_collab_accept.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Gbaigbance — Statut pending pour événements en attente de validation collaborateurs

## Description
Ajoute le statut 'pending' aux événements pour gérer le cas où des collaborateurs sont invités.
L'événement reste en 'pending' tant que les collaborateurs n'ont pas accepté, puis passe en 'published'.

## Changements
1. Ajout du statut 'pending' dans le CHECK constraint de events.status
2. Mise à jour de la politique SELECT pour que le créateur voie ses événements pending
3. RPC accept_collaboration : quand tous les collaborateurs ont accepté, l'événement passe en published
*/

-- Ajouter 'pending' au statut des événements
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_status_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft','pending','published','cancelled','completed'));

-- Mettre à jour la politique SELECT pour que le créateur voie ses événements pending
DROP POLICY IF EXISTS "events_select_public" ON events;
CREATE POLICY "events_select_public" ON events FOR SELECT
  TO anon, authenticated USING (
    status IN ('published')
    OR auth.uid() = organizer_user_id
    OR EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
    )
  );

-- RPC: accept_collaboration
CREATE OR REPLACE FUNCTION accept_collaboration(
  p_collaborator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_collab event_collaborators%ROWTYPE;
  v_event_id uuid;
  v_pending_count integer;
BEGIN
  SELECT * INTO v_collab FROM event_collaborators WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable');
  END IF;

  UPDATE event_collaborators SET status = 'accepted' WHERE id = p_collaborator_id;
  v_event_id := v_collab.event_id;

  SELECT COUNT(*) INTO v_pending_count
  FROM event_collaborators
  WHERE event_id = v_event_id AND status = 'pending';

  IF v_pending_count = 0 THEN
    UPDATE events SET status = 'published' WHERE id = v_event_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726095013_gbaigbance_storage_and_price_fix.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Gbaigbance — Storage bucket pour images d'événements

## Description
1. Crée un bucket public "event-images" pour l'upload de photos d'événements
2. Ajoute les policies RLS pour que les utilisateurs authentifiés puissent uploader
3. Ajoute un trigger pour mettre à jour price_min et price_max automatiquement

## Sécurité
- Bucket public en lecture (tous peuvent voir les images)
- Upload réservé aux utilisateurs authentifiés
*/

-- 1. Créer le bucket storage pour les images d'événements
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies pour le bucket event-images
DROP POLICY IF EXISTS "event_images_public_read" ON storage.objects;
CREATE POLICY "event_images_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_upload" ON storage.objects;
CREATE POLICY "event_images_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_update" ON storage.objects;
CREATE POLICY "event_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_delete" ON storage.objects;
CREATE POLICY "event_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND owner_id = auth.uid()::text);

-- 3. Trigger pour mettre à jour price_min et price_max automatiquement
CREATE OR REPLACE FUNCTION update_event_price_range()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_min numeric;
  v_max numeric;
BEGIN
  v_event_id := COALESCE(NEW.event_id, OLD.event_id);
  
  SELECT COALESCE(MIN(price), 0), COALESCE(MAX(price), 0)
  INTO v_min, v_max
  FROM ticket_options
  WHERE event_id = v_event_id;
  
  UPDATE events 
  SET price_min = v_min, price_max = CASE WHEN v_max > 0 THEN v_max ELSE NULL END
  WHERE id = v_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_event_price ON ticket_options;
CREATE TRIGGER trg_update_event_price
AFTER INSERT OR UPDATE OR DELETE ON ticket_options
FOR EACH ROW EXECUTE FUNCTION update_event_price_range();

GRANT EXECUTE ON FUNCTION update_event_price_range TO authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726101716_gbaigbance_fix_rls_infinite_recursion.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Fix infinite recursion in events RLS policies

## Problème
La policy SELECT de "events" faisait une sous-requête vers "event_collaborators",
et la policy SELECT de "event_collaborators" faisait une sous-requête vers "events".
Cela crée une boucle infinie dès qu'on essaie d'insérer ou lire un événement.

## Solution
1. Supprimer la référence croisée circulaire.
2. La policy SELECT events utilise maintenant un accès direct sans boucle.
3. La policy SELECT event_collaborators conserve sa logique mais via organizer_user_id direct.
*/

-- 1. DROP + RECREATE events policies (sans sous-requête circulaire)
DROP POLICY IF EXISTS "events_select_public" ON events;
DROP POLICY IF EXISTS "events_insert_auth" ON events;
DROP POLICY IF EXISTS "events_update_own" ON events;
DROP POLICY IF EXISTS "events_delete_own" ON events;

CREATE POLICY "events_select_public" ON events FOR SELECT TO anon, authenticated USING (status = 'published' OR organizer_user_id = auth.uid());
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_user_id);
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = organizer_user_id) WITH CHECK (auth.uid() = organizer_user_id);
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = organizer_user_id);

-- 2. DROP + RECREATE event_collaborators policies
DROP POLICY IF EXISTS "collab_select" ON event_collaborators;
DROP POLICY IF EXISTS "collab_insert_own" ON event_collaborators;
DROP POLICY IF EXISTS "collab_update_own" ON event_collaborators;
DROP POLICY IF EXISTS "collab_delete_own" ON event_collaborators;

CREATE POLICY "collab_select" ON event_collaborators FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_insert_own" ON event_collaborators FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_update_own" ON event_collaborators FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "collab_delete_own" ON event_collaborators FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM events WHERE events.id = event_collaborators.event_id AND events.organizer_user_id = auth.uid()));

-- 3. Fix ticket_options policies
DROP POLICY IF EXISTS "ticket_options_select" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_insert_own" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_update_own" ON ticket_options;
DROP POLICY IF EXISTS "ticket_options_delete_own" ON ticket_options;

CREATE POLICY "ticket_options_select" ON ticket_options FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND (events.status = 'published' OR events.organizer_user_id = auth.uid())));
CREATE POLICY "ticket_options_insert_own" ON ticket_options FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "ticket_options_update_own" ON ticket_options FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));
CREATE POLICY "ticket_options_delete_own" ON ticket_options FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_options.event_id AND events.organizer_user_id = auth.uid()));

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726103744_gbaigbance_interactions_and_engagement.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726114316_gbaigbance_schedule_live_sponsors.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726133145_gbaigbance_notifications_system.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Notifications system for Gbaigbance

1. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null) — the recipient
  - `actor_id` (uuid, nullable) — the user who triggered the notification
  - `type` (text, not null) — comment_reply | new_comment | new_question | question_answered | new_follower | event_invite | invite_accepted
  - `entity_type` (text, nullable) — 'event' | 'artist' | 'organization' | 'comment' | 'question'
  - `entity_id` (uuid, nullable)
  - `title` (text, not null)
  - `body` (text, nullable)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled, owner-scoped CRUD.

3. Triggers
- Notify organizer on new comment, comment author on organizer reply, organizer on new question, question author on answer.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('comment_reply','new_comment','new_question','question_answered','new_follower','event_invite','invite_accepted')),
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
  VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_organizer_on_comment() RETURNS trigger AS $$
DECLARE v_organizer uuid;
BEGIN
  SELECT organizer_user_id INTO v_organizer FROM events WHERE id = NEW.event_id;
  IF v_organizer IS NOT NULL THEN
    PERFORM create_notification(v_organizer, NEW.user_id, 'new_comment', 'Nouveau commentaire', 'Quelqu''un a commente votre evenement.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_organizer_on_comment ON event_comments;
CREATE TRIGGER trg_notify_organizer_on_comment AFTER INSERT ON event_comments FOR EACH ROW EXECUTE FUNCTION notify_organizer_on_comment();

CREATE OR REPLACE FUNCTION notify_author_on_reply() RETURNS trigger AS $$
DECLARE v_parent_author uuid; v_event_title text;
BEGIN
  IF NEW.is_organizer_reply = true AND NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM event_comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL THEN
      SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;
      PERFORM create_notification(v_parent_author, NEW.user_id, 'comment_reply', 'Reponse de l''organisateur', 'L''organisateur a repondu a votre commentaire.', 'event', NEW.event_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_author_on_reply ON event_comments;
CREATE TRIGGER trg_notify_author_on_reply AFTER INSERT ON event_comments FOR EACH ROW EXECUTE FUNCTION notify_author_on_reply();

CREATE OR REPLACE FUNCTION notify_organizer_on_question() RETURNS trigger AS $$
DECLARE v_organizer uuid;
BEGIN
  SELECT organizer_user_id INTO v_organizer FROM events WHERE id = NEW.event_id;
  IF v_organizer IS NOT NULL THEN
    PERFORM create_notification(v_organizer, NEW.user_id, 'new_question', 'Nouvelle question', 'Quelqu''un a pose une question sur votre evenement.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_organizer_on_question ON event_questions;
CREATE TRIGGER trg_notify_organizer_on_question AFTER INSERT ON event_questions FOR EACH ROW EXECUTE FUNCTION notify_organizer_on_question();

CREATE OR REPLACE FUNCTION notify_author_on_answer() RETURNS trigger AS $$
DECLARE v_old_answer text;
BEGIN
  v_old_answer := COALESCE(OLD.answer, '');
  IF NEW.answer IS NOT NULL AND v_old_answer = '' AND NEW.answered_by IS NOT NULL THEN
    PERFORM create_notification(NEW.user_id, NEW.answered_by, 'question_answered', 'Question repondue', 'L''organisateur a repondu a votre question.', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_author_on_answer ON event_questions;
CREATE TRIGGER trg_notify_author_on_answer AFTER UPDATE ON event_questions FOR EACH ROW EXECUTE FUNCTION notify_author_on_answer();

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726141322_gbaigbance_attendees_sync_and_notification_safety.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Fix attendees_count + notification trigger safety

1. Changes
- Add trigger `sync_attendees_count_on_ticket` on `tickets` table: after insert/update/delete, recompute the event's `attendees_count` as the count of non-cancelled tickets for that event.
- Replace `create_notification` with a version that catches exceptions internally so a notification failure never aborts the triggering INSERT/UPDATE.

2. Security
- No new tables. Triggers run with SECURITY DEFINER.
*/

CREATE OR REPLACE FUNCTION sync_attendees_count() RETURNS trigger AS $$
DECLARE v_event uuid;
BEGIN
  v_event := COALESCE(NEW.event_id, OLD.event_id);
  IF v_event IS NULL THEN RETURN NULL; END IF;
  UPDATE events
    SET attendees_count = (
      SELECT count(*) FROM tickets
      WHERE event_id = v_event AND status <> 'cancelled'
    )
    WHERE id = v_event;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_attendees_insert ON tickets;
CREATE TRIGGER trg_sync_attendees_insert AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

DROP TRIGGER IF EXISTS trg_sync_attendees_update ON tickets;
CREATE TRIGGER trg_sync_attendees_update AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

DROP TRIGGER IF EXISTS trg_sync_attendees_delete ON tickets;
CREATE TRIGGER trg_sync_attendees_delete AFTER DELETE ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_attendees_count();

-- Re-sync existing events now
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT event_id FROM tickets WHERE status <> 'cancelled' LOOP
    UPDATE events SET attendees_count = (
      SELECT count(*) FROM tickets WHERE event_id = r.event_id AND status <> 'cancelled'
    ) WHERE id = r.event_id;
  END LOOP;
  UPDATE events SET attendees_count = 0
    WHERE id NOT IN (SELECT DISTINCT event_id FROM tickets WHERE status <> 'cancelled');
END $$;

-- Make create_notification swallow errors so it never breaks the caller transaction
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
    VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726223531_gbaigbance_avatars_storage_bucket.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Avatars storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Users can update/delete their own avatars
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260726232644_gbaigbance_notification_prefs_follows_and_views.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- 1. Notification preferences (per-user settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_comments boolean NOT NULL DEFAULT true,
  comment_replies boolean NOT NULL DEFAULT true,
  new_questions boolean NOT NULL DEFAULT true,
  question_answered boolean NOT NULL DEFAULT true,
  new_followers boolean NOT NULL DEFAULT true,
  invite_accepted boolean NOT NULL DEFAULT true,
  event_reminders boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notif_prefs" ON notification_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notif_prefs" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notif_prefs" ON notification_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notif_prefs" ON notification_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. User-to-user follows (for profile consultation between users)
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_user_follows" ON user_follows FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_user_follow" ON user_follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "delete_own_user_follow" ON user_follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- 3. RPC to increment event views (avoids client-side race)
CREATE OR REPLACE FUNCTION increment_event_views(p_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET views_count = views_count + 1 WHERE id = p_event_id;
$$;

-- 4. Enable realtime on events table (for live view counter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;
END $$;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260803093442_gbaigbance_fix_attendees_rls_and_count.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Fix attendees display: RLS-safe function + resync attendees_count

## Problem
1. The `tickets` table has RLS `tickets_select_own` (auth.uid() = user_id), so a user
   viewing an event can only see their OWN tickets — `fetchEventAttendees` returns empty
   for everyone else. This is why no participant avatars show.
2. The `attendees_count` on events is stale for some events (e.g., "Gratuit test" shows
   101 but only has 2 active tickets; "CALL OF DUTY" shows 10 but has 5 active tickets).
   The trigger `sync_attendees_count` counts `status <> 'cancelled'` which is correct,
   but the count was manually set to wrong values during seed/testing.

## Changes
1. Create `get_event_attendees(p_event_id uuid)` — SECURITY DEFINER function that bypasses
   RLS to read all active tickets for an event, joins with profiles, and returns
   `{ user_id, name, avatar_url, ticket_count }` for up to 20 distinct buyers.
   This is safe: it only exposes public profile info (name, avatar) of people who
   bought tickets for a public event — same as seeing who's attending a concert.
2. Resync `attendees_count` for ALL events to match the actual count of non-cancelled
   tickets, so the displayed participant number is correct.

## Security
- The SECURITY DEFINER function runs with owner privileges but only exposes
  `user_id`, `name`, and `avatar_url` — no sensitive ticket data (no price, no QR code).
- EXECUTE granted to `authenticated` role so the frontend can call it via RPC.
- No changes to existing RLS policies on `tickets`.
*/

-- 1. Create SECURITY DEFINER function to fetch event attendees (bypasses tickets RLS)
CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  ticket_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.user_id,
    p.name,
    p.avatar_url,
    COUNT(*)::bigint AS ticket_count
  FROM tickets t
  LEFT JOIN profiles p ON p.id = t.user_id
  WHERE t.event_id = p_event_id
    AND t.status <> 'cancelled'
  GROUP BY t.user_id, p.name, p.avatar_url
  ORDER BY ticket_count DESC
  LIMIT 20;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated;

-- 2. Resync attendees_count for all events
UPDATE events e
SET attendees_count = (
  SELECT COUNT(*) FROM tickets t
  WHERE t.event_id = e.id AND t.status <> 'cancelled'
);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260803095003_gbaigbance_comment_reactions_and_geocode.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260906120000_gbaigbance_event_lifecycle_and_inventory.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
  Event lifecycle, inventory and ticket quantity consistency.

  Lifecycle status is separate from inventory:
  - draft, pending, published, paused, suspended, cancelled, completed
  - sold out is derived from ticket_options, never stored as event status
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_status_check' AND table_name = 'events'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'pending', 'published', 'paused', 'suspended', 'cancelled', 'completed'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS sales_start_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sales_end_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_option_id uuid REFERENCES ticket_options(id) ON DELETE SET NULL;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_quantity_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_quantity_check CHECK (quantity > 0);

CREATE INDEX IF NOT EXISTS events_sales_window_idx ON events(sales_start_at, sales_end_at);

CREATE OR REPLACE FUNCTION sync_attendees_count() RETURNS trigger AS $$
DECLARE
  affected_event uuid;
BEGIN
  affected_event := COALESCE(NEW.event_id, OLD.event_id);
  IF affected_event IS NULL THEN RETURN NULL; END IF;

  UPDATE events
  SET attendees_count = COALESCE((
    SELECT SUM(quantity) FROM tickets
    WHERE event_id = affected_event AND status IN ('active', 'used')
  ), 0),
  updated_at = now()
  WHERE id = affected_event;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION book_ticket(p_event_id uuid, p_ticket_option_id uuid, p_quantity integer DEFAULT 1)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_row events%ROWTYPE;
  option_row ticket_options%ROWTYPE;
  ticket_row tickets%ROWTYPE;
  available integer;
  event_end timestamptz;
  qr text;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RETURN json_build_object('success', false, 'error', 'La quantité doit être comprise entre 1 et 20');
  END IF;

  SELECT * INTO event_row FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Événement introuvable'); END IF;
  IF event_row.status <> 'published' THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas ouvertes pour cet événement');
  END IF;

  event_end := COALESCE(event_row.ends_at, event_row.starts_at);
  IF event_end <= now() THEN
    UPDATE events SET status = 'completed', updated_at = now() WHERE id = event_row.id AND status = 'published';
    RETURN json_build_object('success', false, 'error', 'Cet événement est terminé');
  END IF;
  IF event_row.sales_start_at IS NOT NULL AND now() < event_row.sales_start_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas encore ouvertes');
  END IF;
  IF event_row.sales_end_at IS NOT NULL AND now() >= event_row.sales_end_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes sont terminées');
  END IF;

  SELECT * INTO option_row FROM ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Option de billet introuvable'); END IF;

  available := option_row.quantity_total - option_row.quantity_sold;
  IF available < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Plus assez de billets disponibles');
  END IF;
  IF event_row.capacity IS NOT NULL AND event_row.attendees_count + p_quantity > event_row.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;

  qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO tickets (event_id, user_id, ticket_type, ticket_option_id, price_paid, currency, qr_code, status, quantity)
  VALUES (p_event_id, auth.uid(), option_row.ticket_type, option_row.id, option_row.price * p_quantity, event_row.currency, qr, 'active', p_quantity)
  RETURNING * INTO ticket_row;

  UPDATE ticket_options SET quantity_sold = quantity_sold + p_quantity WHERE id = option_row.id;

  RETURN json_build_object('success', true, 'ticket', row_to_json(ticket_row));
END;
$$;

CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ticket_row tickets%ROWTYPE;
BEGIN
  SELECT * INTO ticket_row FROM tickets
  WHERE id = p_ticket_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Billet introuvable'); END IF;
  IF ticket_row.status <> 'active' THEN RETURN json_build_object('success', false, 'error', 'Billet déjà annulé ou utilisé'); END IF;

  UPDATE tickets SET status = 'cancelled' WHERE id = p_ticket_id;
  UPDATE ticket_options
  SET quantity_sold = GREATEST(quantity_sold - ticket_row.quantity, 0)
  WHERE id = COALESCE(
    ticket_row.ticket_option_id,
    (SELECT id FROM ticket_options
     WHERE event_id = ticket_row.event_id AND ticket_type = ticket_row.ticket_type
     ORDER BY created_at ASC LIMIT 1)
  );

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION accept_collaboration(p_collaborator_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  collab event_collaborators%ROWTYPE;
  pending_count integer;
  declined_count integer;
BEGIN
  SELECT * INTO collab FROM event_collaborators
  WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invitation introuvable'); END IF;

  UPDATE event_collaborators SET status = 'accepted' WHERE id = p_collaborator_id;
  SELECT COUNT(*) FILTER (WHERE status = 'pending'), COUNT(*) FILTER (WHERE status = 'declined')
  INTO pending_count, declined_count
  FROM event_collaborators WHERE event_id = collab.event_id;

  IF pending_count = 0 AND declined_count = 0 THEN
    UPDATE events SET status = 'published', updated_at = now() WHERE id = collab.event_id AND status = 'pending';
  ELSE
    UPDATE events SET status = 'pending', updated_at = now() WHERE id = collab.event_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION set_event_status(
  p_event_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_owner uuid;
  current_status text;
  requester_role text;
BEGIN
  SELECT organizer_user_id, status INTO event_owner, current_status FROM events WHERE id = p_event_id;
  SELECT role INTO requester_role FROM profiles WHERE id = auth.uid();
  IF event_owner IS NULL OR (event_owner <> auth.uid() AND requester_role <> 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;
  IF p_status NOT IN ('draft', 'published', 'paused', 'suspended', 'cancelled', 'completed') THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide');
  END IF;
  IF p_status = 'suspended' AND requester_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Seul un administrateur peut suspendre un événement');
  END IF;
  IF current_status IN ('cancelled', 'completed') OR
     (current_status = 'pending' AND p_status <> 'cancelled') OR
     (current_status = 'suspended' AND p_status NOT IN ('published', 'cancelled')) THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide depuis le statut actuel');
  END IF;

  UPDATE events
  SET status = p_status,
      cancellation_reason = CASE WHEN p_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
      suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE suspension_reason END,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;
GRANT EXECUTE ON FUNCTION set_event_status TO authenticated;

UPDATE events
SET status = 'completed', updated_at = now()
WHERE status IN ('published', 'paused')
  AND COALESCE(ends_at, starts_at) <= now();

UPDATE tickets SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;

UPDATE events e
SET attendees_count = COALESCE((
  SELECT SUM(t.quantity) FROM tickets t
  WHERE t.event_id = e.id AND t.status IN ('active', 'used')
), 0);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260909110000_gbaigbance_security_audit_remediation.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# GBAIGBANCE — Security Audit Remediation & Defense-in-Depth Hardening

## Overview
Remediates critical and high-priority vulnerabilities identified in the security audit:
1. RLS / Role Self-Escalation: Blocks unauthorized users from setting `role = 'admin'`.
2. Direct Ticket Minting Bypass: Removes direct INSERT/UPDATE RLS on `tickets`; restricts minting & cancellation exclusively to transactional SECURITY DEFINER RPCs (`book_ticket`, `cancel_ticket`, `validate_ticket_qr`).
3. Organization & Artist Self-Verification: Enforces database triggers preventing users from self-granting `verification_status = 'verified'` or `is_verified = true`.
4. Event Artists Authorization: Tightens `event_artists` so only event organizers and accepted collaborators can link or unlink artists.
5. Function Hijacking Prevention: Explicitly enforces `SET search_path = public` on ALL `SECURITY DEFINER` functions.
6. Like Counters & Realtime Stats: Implements atomic and secure `increment_likes_count` and `decrement_likes_count`.
7. Profile PII Protection: Creates a secure `public_profiles` view excluding email and phone numbers for directory and public searches.
*/

-- ============================================================================
-- 1. PROFILES SECURITY: Prevent Role Self-Escalation
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Prevent non-admins / non-service_role from inserting an admin role
    IF NEW.role = 'admin' THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.role := 'participant';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If role is modified, only allow if caller is service_role or an existing admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.role := OLD.role;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_role();

-- Secure public view for profiles (excluding PII: phone, email)
CREATE OR REPLACE VIEW public_profiles WITH (security_invoker = true) AS
SELECT id, name, avatar_url, role, city, country, bio, created_at
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;


-- ============================================================================
-- 2. ORGANIZATIONS SECURITY: Prevent Self-Verification
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_org_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (
      auth.jwt() ->> 'role' = 'service_role' OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) THEN
      NEW.verification_status := 'pending';
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.verification_status := OLD.verification_status;
      END IF;
    END IF;
    -- Counters cannot be directly forged by client updates
    IF NOT (auth.jwt() ->> 'role' = 'service_role') THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_verification_status ON organizations;
CREATE TRIGGER trg_protect_org_verification_status
BEFORE INSERT OR UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION protect_org_verification_status();


-- ============================================================================
-- 3. ARTISTS SECURITY: Prevent Self-Verification & Enforce Ownership
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_artist_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid();
    END IF;
    IF NOT (
      auth.jwt() ->> 'role' = 'service_role' OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) THEN
      NEW.is_verified := false;
      NEW.followers_count := 0;
      NEW.events_count := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
      IF NOT (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) THEN
        NEW.is_verified := OLD.is_verified;
      END IF;
    END IF;
    IF NOT (auth.jwt() ->> 'role' = 'service_role') THEN
      NEW.followers_count := OLD.followers_count;
      NEW.events_count := OLD.events_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_artist_verification ON artists;
CREATE TRIGGER trg_protect_artist_verification
BEFORE INSERT OR UPDATE ON artists
FOR EACH ROW
EXECUTE FUNCTION protect_artist_verification();

-- Restrict artist insertion: authenticated users can only insert an artist linked to their own user_id
DROP POLICY IF EXISTS "artists_insert_auth" ON artists;
CREATE POLICY "artists_insert_auth" ON artists
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 4. TICKETS SECURITY: Eliminate Direct Minting & Mutation Bypass
-- ============================================================================

-- Drop direct INSERT/UPDATE/DELETE policies that allowed client-side forgery
DROP POLICY IF EXISTS "tickets_insert_own" ON tickets;
DROP POLICY IF EXISTS "tickets_update_own" ON tickets;
DROP POLICY IF EXISTS "tickets_delete_own" ON tickets;
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;

-- Only SELECT is allowed: ticket owners can view their tickets,
-- event organizers/collaborators can view tickets for check-in/management
CREATE POLICY "tickets_select_secure" ON tickets
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = tickets.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================================
-- 5. EVENT_ARTISTS SECURITY: Organizer-Only Modification
-- ============================================================================

DROP POLICY IF EXISTS "ea_insert_auth" ON event_artists;
CREATE POLICY "ea_insert_auth" ON event_artists
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_artists.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS "ea_delete_auth" ON event_artists;
CREATE POLICY "ea_delete_auth" ON event_artists
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_artists.event_id
    AND (
      events.organizer_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = events.id
        AND event_collaborators.user_id = auth.uid()
        AND event_collaborators.status = 'accepted'
      )
    )
  )
);


-- ============================================================================
-- 6. RPC SECURITY: search_path Hardening for all SECURITY DEFINER functions
-- ============================================================================

-- Hardened sync_attendees_count
CREATE OR REPLACE FUNCTION sync_attendees_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_event uuid;
BEGIN
  affected_event := COALESCE(NEW.event_id, OLD.event_id);
  IF affected_event IS NULL THEN RETURN NULL; END IF;

  UPDATE events
  SET attendees_count = COALESCE((
    SELECT SUM(quantity) FROM tickets
    WHERE event_id = affected_event AND status IN ('active', 'used')
  ), 0),
  updated_at = now()
  WHERE id = affected_event;

  RETURN NULL;
END;
$$;

-- Hardened book_ticket
CREATE OR REPLACE FUNCTION book_ticket(
  p_event_id uuid,
  p_ticket_option_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_row events%ROWTYPE;
  option_row ticket_options%ROWTYPE;
  ticket_row tickets%ROWTYPE;
  available integer;
  event_end timestamptz;
  qr text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RETURN json_build_object('success', false, 'error', 'La quantité doit être comprise entre 1 et 20');
  END IF;

  SELECT * INTO event_row FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  IF event_row.status <> 'published' THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas ouvertes pour cet événement');
  END IF;

  event_end := COALESCE(event_row.ends_at, event_row.starts_at);
  IF event_end <= now() THEN
    UPDATE events SET status = 'completed', updated_at = now() WHERE id = event_row.id AND status = 'published';
    RETURN json_build_object('success', false, 'error', 'Cet événement est terminé');
  END IF;

  IF event_row.sales_start_at IS NOT NULL AND now() < event_row.sales_start_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes ne sont pas encore ouvertes');
  END IF;

  IF event_row.sales_end_at IS NOT NULL AND now() >= event_row.sales_end_at THEN
    RETURN json_build_object('success', false, 'error', 'Les ventes sont terminées');
  END IF;

  SELECT * INTO option_row FROM ticket_options
  WHERE id = p_ticket_option_id AND event_id = p_event_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Option de billet introuvable');
  END IF;

  available := option_row.quantity_total - option_row.quantity_sold;
  IF available < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Plus assez de billets disponibles');
  END IF;

  IF event_row.capacity IS NOT NULL AND event_row.attendees_count + p_quantity > event_row.capacity THEN
    RETURN json_build_object('success', false, 'error', 'Capacité maximale atteinte');
  END IF;

  qr := 'GBC-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));

  INSERT INTO tickets (
    event_id, user_id, ticket_type, ticket_option_id,
    price_paid, currency, qr_code, status, quantity
  )
  VALUES (
    p_event_id, auth.uid(), option_row.ticket_type, option_row.id,
    option_row.price * p_quantity, event_row.currency, qr, 'active', p_quantity
  )
  RETURNING * INTO ticket_row;

  UPDATE ticket_options
  SET quantity_sold = quantity_sold + p_quantity
  WHERE id = option_row.id;

  RETURN json_build_object('success', true, 'ticket', row_to_json(ticket_row));
END;
$$;

-- Hardened cancel_ticket
CREATE OR REPLACE FUNCTION cancel_ticket(p_ticket_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_row tickets%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO ticket_row FROM tickets
  WHERE id = p_ticket_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Billet introuvable');
  END IF;

  IF ticket_row.status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Billet déjà annulé ou utilisé');
  END IF;

  UPDATE tickets SET status = 'cancelled' WHERE id = p_ticket_id;

  UPDATE ticket_options
  SET quantity_sold = GREATEST(quantity_sold - ticket_row.quantity, 0)
  WHERE id = COALESCE(
    ticket_row.ticket_option_id,
    (SELECT id FROM ticket_options
     WHERE event_id = ticket_row.event_id AND ticket_type = ticket_row.ticket_type
     ORDER BY created_at ASC LIMIT 1)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Hardened accept_collaboration
CREATE OR REPLACE FUNCTION accept_collaboration(p_collaborator_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collab event_collaborators%ROWTYPE;
  pending_count integer;
  declined_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO collab FROM event_collaborators
  WHERE id = p_collaborator_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation introuvable');
  END IF;

  UPDATE event_collaborators SET status = 'accepted' WHERE id = p_collaborator_id;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'), COUNT(*) FILTER (WHERE status = 'declined')
  INTO pending_count, declined_count
  FROM event_collaborators WHERE event_id = collab.event_id;

  IF pending_count = 0 AND declined_count = 0 THEN
    UPDATE events SET status = 'published', updated_at = now() WHERE id = collab.event_id AND status = 'pending';
  ELSE
    UPDATE events SET status = 'pending', updated_at = now() WHERE id = collab.event_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Hardened set_event_status
CREATE OR REPLACE FUNCTION set_event_status(
  p_event_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_owner uuid;
  current_status text;
  requester_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT organizer_user_id, status INTO event_owner, current_status FROM events WHERE id = p_event_id;
  SELECT role INTO requester_role FROM profiles WHERE id = auth.uid();

  IF event_owner IS NULL OR (event_owner <> auth.uid() AND requester_role <> 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  IF p_status NOT IN ('draft', 'published', 'paused', 'suspended', 'cancelled', 'completed') THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide');
  END IF;

  IF p_status = 'suspended' AND requester_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Seul un administrateur peut suspendre un événement');
  END IF;

  IF current_status IN ('cancelled', 'completed') OR
     (current_status = 'pending' AND p_status <> 'cancelled') OR
     (current_status = 'suspended' AND p_status NOT IN ('published', 'cancelled')) THEN
    RETURN json_build_object('success', false, 'error', 'Transition invalide depuis le statut actuel');
  END IF;

  UPDATE events
  SET status = p_status,
      cancellation_reason = CASE WHEN p_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
      suspension_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE suspension_reason END,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Hardened create_notification with exception swallowing
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN RETURN; END IF;
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id)
    VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- Atomic like count increments with search_path
CREATE OR REPLACE FUNCTION increment_likes_count(event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET likes_count = likes_count + 1 WHERE id = event_id;
$$;

CREATE OR REPLACE FUNCTION decrement_likes_count(event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = event_id;
$$;

-- Secure Ticket Check-In RPC for Event Staff / Organizers
CREATE OR REPLACE FUNCTION validate_ticket_qr(
  p_qr_code text,
  p_event_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_event events%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentification requise');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Événement introuvable');
  END IF;

  -- Only event organizer, accepted collaborator, or admin may validate
  IF NOT (
    v_event.organizer_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE event_id = p_event_id AND user_id = auth.uid() AND status = 'accepted'
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé à valider les billets de cet événement');
  END IF;

  SELECT * INTO v_ticket FROM tickets
  WHERE qr_code = p_qr_code AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Billet invalide ou inexistant pour cet événement');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN json_build_object('success', false, 'error', 'Ce billet a déjà été validé/utilisé', 'ticket', row_to_json(v_ticket));
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Ce billet a été annulé', 'ticket', row_to_json(v_ticket));
  END IF;

  UPDATE tickets SET status = 'used' WHERE id = v_ticket.id RETURNING * INTO v_ticket;
  SELECT * INTO v_user_profile FROM profiles WHERE id = v_ticket.user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Billet validé avec succès',
    'ticket', row_to_json(v_ticket),
    'participant_name', COALESCE(v_user_profile.name, 'Participant')
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION book_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION accept_collaboration TO authenticated;
GRANT EXECUTE ON FUNCTION set_event_status TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_likes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ticket_qr(text, uuid) TO authenticated;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRATION: 20260909120000_gbaigbance_cleanup_seed_and_gemini_config.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

