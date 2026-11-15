# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.  
À lire en entier au début de chaque session. Mise à jour à la fin (protocole de sécurité d'écriture).

## Tâche active

Session 1 (2026-11-15) — Audit léger et plan progressif.  
Pas de modification de code ni de schéma dans cette session. Création de cette mémoire uniquement.

## Objectif

Rendre le backend cohérent, sûr et bien rangé (API Node/Express, Edge Functions, Supabase, liaisons front↔back) sans rien casser. Une amélioration significative par jour, rétrocompatible.

## Progression

- Termine :
  - Lecture en lecture seule de `PROJECT_MEMORY.md` (main) et `FRONTEND_MEMORY.md` (FRONTEND-iA).
  - Confirmation branche `FRONTEND-iA` existante (SHA 1cde9f46…).
  - Identification projet Supabase actif : `GBAIGBANCE EVENTS` (`lwwiolbofrqakvrdvbbj`), région eu-central-1, status ACTIVE_HEALTHY.
  - Liste des tables publiques + Edge Functions.
  - Inventaire des migrations.
- En cours / restant :
  - Cartographie progressive domaine par domaine (utilisateurs, événements, billets, paiements…).
  - Vérification des liaisons front↔back (appels, types, erreurs).
  - Advisors Supabase et logs (prochaines sessions).

## Fichiers concernés

- `BACKEND_MEMORY.md` (ce fichier)
- `server.ts` (Node/Express + WebSocket + outils IA)
- `supabase/functions/ai-assistant/`
- `supabase/functions/platform-stats/`
- `supabase/migrations/`
- `api/events.ts`
- Types partagés côté front si liaison cassée.

## Dernière action

2026-11-15 — Création de BACKEND_MEMORY.md + audit léger (tables, edge functions, URL Supabase, mémoires front/project).

## Prochaine étape

P1 — Vérifier et documenter la liaison `server.ts` ↔ Supabase (URL/projet actif, variables d'environnement, client service role).  
Puis audit domaine « événements » (tables `events`, `ticket_options`, RPC `get_nearby_events_rpc`, repli Haversine déjà corrigé côté edge).

## Vérifications

- Branche `FRONTEND-iA` existe et est la cible d'écriture.
- Projet Supabase `lwwiolbofrqakvrdvbbj` actif.
- Tables listées : toutes en RLS, 0 lignes actuellement (seed nettoyé).
- Edge functions actives : `ai-assistant` (verify_jwt=true), `platform-stats` (verify_jwt=false).
- Aucun commit de code dans cette session. Ce fichier sera relu distant après push.

## Cartographie des données (initiale)

### Tables principales (public)

| Table | RLS | Lignes | Notes |
|-------|-----|--------|-------|
| profiles | oui | 0 | FK auth.users |
| organizations | oui | 0 | |
| artists | oui | 0 | |
| events | oui | 0 | category, status, is_demo, geo |
| tickets | oui | 0 | qr_code unique, status |
| ticket_options | oui | 0 | inventaire |
| event_likes, artist_follows, organization_follows | oui | 0 | |
| event_collaborators, event_comments, event_reactions, event_questions, event_schedule, event_live_links, event_sponsors, event_reports, event_view_daily, notifications | oui | 0 | |
| example | oui | 0 | table de test |

Conventions : montants en numeric (XOF), dates timestamptz (UTC), téléphones à normaliser (+228/+229), is_demo pour seed.

### Relations clés

- events.organizer_id → organizations
- events.organizer_user_id → auth.users
- tickets.event_id → events
- tickets.user_id → auth.users
- Nombreuses tables filles sur events (likes, comments, options, etc.)

### Edge Functions

- `ai-assistant` : outils search/get_nearby/get_my_tickets… (repli Haversine déjà aligné dans le dépôt, déploiement à confirmer).
- `platform-stats` : stats publiques (verify_jwt=false — à surveiller).

### Points d'attention immédiats

- `server.ts` contient un DEFAULT_SUPABASE_URL pointant vers un ancien projet (`qbngqstyhusndngkours`). Le projet actif est `lwwiolbofrqakvrdvbbj`. À vérifier via variables d'environnement réelles.
- Conflit connu sur `server.ts` entre `FRONTEND-iA` et `main` (route Express `/api/platform-stats`). Ne pas trancher sans décision propriétaire.
- Quantity sur tickets : présent dans les migrations et `complete_schema.sql` ; à confirmer en live si besoin.

## Liaisons front/back

| Zone | Statut | Notes |
|------|--------|-------|
| Auth / profiles | À auditer | |
| Événements (liste, détail, nearby) | Partiel | Edge + server.ts + Rust core |
| Billets / réservation | À auditer | RPC book_ticket, inventaire |
| Paiements mobile money | À auditer | Idempotence, webhooks, statuts |
| Stats organisateur / plateforme | Branché (edge) | |
| IA concierge | Branché | Quota + outils |
| Notifications / rappels | À vérifier | |

## Migrations appliquées

Liste dans `supabase/migrations/` (20260725… à 20261110…). Dernières : hardening paiements/quota, refunds idempotents, rate limits IA, wallet/ticketing.  
Retour arrière : à documenter fichier par fichier si modification future.

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts` (route Express platform-stats vs version FRONTEND-iA) avant toute fusion main → FRONTEND-iA.
2. Confirmation du projet Supabase de production et des secrets (SUPABASE_URL, SERVICE_ROLE, etc.) — ne pas hardcoder.
3. Déploiement de l'edge function `ai-assistant` si le correctif Haversine n'est pas encore en prod.

## Dette backend

- Alignement URL/projet Supabase dans le code vs environnement réel.
- Audit RLS approfondi (recursion déjà corrigée dans le passé).
- Idempotence et signature webhooks paiements (P0 futur).
- Unicité billets / double vente (contraintes + logique).
- Normalisation numéros de téléphone.

## Incidents

- Aucun dans cette session.
- Historique front : incidents de troncature via connecteur déjà documentés dans FRONTEND_MEMORY (restaurés).

## Backlog

1. P1 — Clarifier et documenter la configuration Supabase réelle (URL, clés).
2. P1 — Audit domaine événements + nearby + inventaire.
3. P2 — Liaisons billets / réservation (front → RPC → base).
4. P2 — Paiements (statuts, idempotence, réconciliation).
5. P3 — Harmonisation nommage, index manquants, vues utiles.
6. P0 futur — Sécurité webhooks et RLS exposée.

## Historique

- 2026-11-15 — Session 1 : audit léger, création de cette mémoire, cartographie initiale, identification projet Supabase et points d'attention.

## Pour les autres automatisations

- Ne pas modifier `FRONTEND_MEMORY.md`.
- Ne pas toucher aux fichiers purement visuels.
- Toute liaison front↔back (types, appels API, gestion d'erreur) doit rester rétrocompatible.
- Conflit `server.ts` : attendre décision propriétaire.
- Projet Supabase de référence : `lwwiolbofrqakvrdvbbj` (GBAIGBANCE EVENTS).
