# Guide de Migration Supabase — Gbaïgbancê

Ce guide vous accompagne pour finaliser la migration de toutes vos tables, données, fonctions RPC et buckets de stockage vers votre nouvelle instance Supabase :

- **Supabase URL** : `https://lwwiolbofrqakvrdvbbj.supabase.co`
- **Publishable Key** : `sb_publishable_eE9BhdjrsQP6dwfo3hV88A_u831UYMF`

---

## Étape 1 : Exécuter le schéma SQL complet dans Supabase

Un script SQL consolidé et idempotent contenant l'intégralité des 17 migrations du projet a été généré :
📁 **`supabase/complete_schema.sql`**

### Comment l'exécuter :
1. Rendez-vous sur votre console Supabase :
   👉 [https://supabase.com/dashboard/project/lwwiolbofrqakvrdvbbj](https://supabase.com/dashboard/project/lwwiolbofrqakvrdvbbj)
2. Dans le menu de gauche, cliquez sur **SQL Editor** (l'icône `>_`).
3. Cliquez sur **New query** (Nouvelle requête).
4. Ouvrez le fichier `supabase/complete_schema.sql` de ce projet, copiez l'intégralité de son contenu et collez-le dans l'éditeur SQL de Supabase.
5. Cliquez sur le bouton vert **Run** (ou `Ctrl + Enter` / `Cmd + Enter`).

---

## Ce que le script SQL configure automatiquement :

1. **Tables principales & Relations** :
   - `profiles` : Profils utilisateurs (rôles: participant, organisateur, artiste, admin).
   - `events` : Événements avec géolocalisation, prix, capacité, dates et statut.
   - `ticket_options` : Types de billets par événement (Gratuit, Standard, VIP, VVIP) avec gestion des stocks.
   - `tickets` : Billets achetés avec QR code unique (`GBA-...`).
   - `event_collaborators` : Collaborations entre organisateurs et artistes (rôles, statuts d'invitation).
   - `organizations` & `artists` : Structures organisatrices et profils artistes avec compteurs et vérification.
   - `event_likes` & `artist_follows` : Favoris et abonnements temps réel.
   - `event_comments` & `comment_reactions` : Espace communautaire avec réactions emojis.
   - `event_questions` : FAQ interactive et questions/réponses en direct.
   - `event_schedule` : Programme horaire détaillé par scène et créneau.
   - `event_live_links` : Liens de diffusion en direct (YouTube, Twitch, TikTok, etc.).
   - `event_sponsors` : Partenaires et sponsors par palier (Diamond, Platinum, Gold, Silver, Bronze).
   - `notifications` & `notification_preferences` : Système complet de notifications in-app et push.

2. **Sécurité & Politiques RLS (Row Level Security)** :
   - Protection contre l'auto-escalade de rôle (`role = 'admin'` verrouillé).
   - Protection contre le mint direct de tickets sans validation.
   - Vue sécurisée `public_profiles` protégeant les emails et numéros de téléphone.
   - Politiques de lecture publique et de modification restreinte aux propriétaires.

3. **Fonctions RPC transactionnelles sécurisées** :
   - `book_ticket(p_event_id, p_ticket_option_id, p_quantity)` : Réservation atomique vérifiant la disponibilité des places.
   - `cancel_ticket(p_ticket_id)` : Annulation sécurisée avec libération du quota.
   - `validate_ticket_qr(p_qr_code, p_event_id)` : Contrôle d'accès et scan de QR codes à l'entrée.
   - `accept_collaboration(p_collaboration_id)` : Validation d'invitation collaborateur.
   - `set_event_status(p_event_id, p_status)` : Contrôle du cycle de vie événementiel.
   - `increment_likes_count(p_event_id)` & `decrement_likes_count(p_event_id)` : Compteurs atomiques.
   - `increment_event_views(p_event_id)` : Incrément anti-collision des vues.
   - `get_event_attendees(p_event_id)` : Récupération sécurisée des participants.

4. **Stockage (Storage Buckets)** :
   - Bucket public `event-images` pour les affiches et galeries d'événements.
   - Bucket public `avatars` pour les photos de profil.

5. **Temps Réel (Supabase Realtime)** :
   - Publication `supabase_realtime` activée sur la table `events` pour le comptage live des vues et des interactions.

---

## Étape 2 : Configuration de l'application (Déjà fait !)

L'application est d'ores et déjà configurée pour pointer directement sur votre nouveau projet :
- Fichiers `.env` et `.env.local` configurés avec `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Support natif dans `vite.config.ts` (`envPrefix: ['VITE_', 'NEXT_PUBLIC_']`).
- Client Supabase dans `src/services/supabase.ts` avec vos nouvelles clés en valeur par défaut.
