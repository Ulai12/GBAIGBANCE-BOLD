# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.  
À lire en entier au début de chaque session. Mise à jour à la fin (protocole de sécurité d'écriture).

## Tâche active

Session 3 (2026-11-16) — Advisors Supabase + index FK. server.ts restauré.

## Objectif

Rendre le backend cohérent, sûr et bien rangé (API Node/Express, Edge Functions, Supabase, liaisons front↔back) sans rien casser. Une amélioration significative par jour, rétrocompatible.

## Progression

- Termine :
  - Audit léger session 1.
  - Restauration de `server.ts`.
  - Advisors Supabase (sécurité + performance) consultés.
  - Migration d'index FK créée et poussée.
- En cours :
  - Correction URL hardcodée dans `server.ts` (toujours présente, écritures longues risquées).

## Fichiers concernés

- `BACKEND_MEMORY.md`
- `supabase/migrations/20261116000000_add_missing_fk_indexes.sql`
- `server.ts` (restauré, non modifié ce tour)

## Dernière action

2026-11-16 — Migration index FK (commit af475ae) + consignation advisors.

## Prochaine étape

1. Appliquer la migration sur Supabase (ou noter à faire).
2. Traiter progressivement les WARN sécurité (search_path, SECURITY DEFINER exposés) — certaines nécessitent validation propriétaire.
3. Corriger DEFAULT_SUPABASE_URL par petite modification si possible.

## Vérifications

- Migration relue distante : SHA 30a80a1f…, 1017 octets, contenu exact.
- server.ts toujours sain (30154 octets).

## Cartographie des données

(inchangée)

## Points d'attention immédiats (advisors)

### Sécurité
- RLS enabled sans policy : `event_view_daily`, `example`.
- search_path mutable : `book_ticket`, `cancel_ticket`, `accept_collaboration`, `update_event_price_range`.
- SECURITY DEFINER executable par anon/authenticated : `book_ticket`, `cancel_ticket`, `accept_collaboration`, `create_notification`, `get_platform_stats`, `record_event_view`, etc. (9 fonctions). Risque élevé sur book_ticket.

### Performance
- 16 FK non indexées (migration partielle ajoutée).
- Nombreuses policies RLS avec re-évaluation auth() par ligne (initplan).

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts` avec `main`.
2. Confirmation des variables d'environnement Supabase.
3. Revue des fonctions SECURITY DEFINER exposées (surtout book_ticket) avant durcissement.
4. Application de la migration index si souhaitée.

## Incidents

- 2026-11-15 : troncature server.ts. Restauration effectuée.
- Note frontend : placeholder sur TicketsScreen.tsx (ne pas toucher).

## Historique

- 2026-11-15 — Sessions 1-2 : audit + incident troncature.
- 2026-11-16 — Restauration server.ts + advisors + migration index FK.

## Pour les autres automatisations

- Projet Supabase : `lwwiolbofrqakvrdvbbj`.
- Ne pas réécrire server.ts en entier (risque troncature).
- Migration index : `20261116000000_add_missing_fk_indexes.sql` (rollback documenté).

## Taches À faire

Demandées par l'automatisation « développement continu » GBAIGBANCE-BOLD (session du 2026-11-16, commit `main` `2803c8c`). Ne pas réécrire `server.ts` en entier.

1. **Push rappels application fermée.** Constat : les rappels 24 h / 2 h et les alertes « nouvelle date » ne partent que tant que l'onglet est ouvert (`src/App.tsx`, `src/services/pushNotificationService.ts`, notification locale / Service Worker). L'écran Réglages promet pourtant des alertes même si l'application est fermée. Il manque un job serveur (cron ou edge) qui envoie ces push, en respectant `notification_preferences.event_reminders`. Le client ne peut pas le garantir.
2. **Déployer l'edge `ai-assistant`.** Le repli Haversine de `get_nearby_events` est dans le dépôt `main` depuis le 2026-11-13 (`supabase/functions/ai-assistant/index.ts`, `supabase/functions/_shared/aiCatalog.ts`) mais n'a pas été déployé (pas de CI). À déployer après relecture, sans toucher au succès RPC déjà en place.
