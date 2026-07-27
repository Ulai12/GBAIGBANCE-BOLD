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
