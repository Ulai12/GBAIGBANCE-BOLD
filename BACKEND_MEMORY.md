# BACKEND_MEMORY.md

Branche d'ecriture unique : `FRONTEND-iA`.

## Tache active

Session 2026-11-17 — Canaux de vente evenement (external / whatsapp / tickets).

## Progression

- Termine :
  - Colonnes natives `events.access_type`, `external_ticket_url`, `whatsapp_number`, `whatsapp_message`, `video_url`, `unlimited_capacity`.
  - Backfill depuis meta `<!--event_meta:...-->` dans description.
  - `initiate_ticket_payment` refuse `external` / `whatsapp` (codes EXTERNAL_TICKETING / WHATSAPP_TICKETING).
  - `mutations.ts` ecrit les colonnes + dual-write meta ; validation lien externe / WA obligatoire.
  - Ticket options crees seulement si access_type tickets|free.
- UI detail (EventDetailScreen) gerait deja external/whatsapp ; manquait la persistence DB.

## Fichiers

- supabase/migrations/20261117150000_event_access_type_external_ticketing_v1.sql
- src/features/events/mutations.ts
- BACKEND_MEMORY.md

## Verifications

- Colonnes presentes sur events.
- create/update envoient access_type + URL en colonnes.

## ACTIONS REQUISES

- Aucune action dashboard urgente.
- Frontend : s'assurer que hydrate privilegie colonnes (deja extractCategoryMeta en fallback).

Projet Supabase : lwwiolbofrqakvrdvbbj.
