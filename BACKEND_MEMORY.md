# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.  
À lire en entier au début de chaque session. Mise à jour à la fin (protocole de sécurité d'écriture).

## Tâche active

Session 4 (2026-11-16) — Application des migrations validées (index + sécurité fonctions).

## Objectif

Rendre le backend cohérent, sûr et bien rangé sans rien casser.

## Progression

- Termine :
  - Migration index FK appliquée sur Supabase (vérifiée par requête).
  - search_path fixé sur book_ticket, cancel_ticket, accept_collaboration, update_event_price_range.
  - REVOKE EXECUTE FROM anon sur book_ticket, cancel_ticket, accept_collaboration.
  - Fichiers de migration correspondants poussés.
- En cours :
  - DEFAULT_SUPABASE_URL toujours à corriger (risque troncature sur server.ts).
  - Autres fonctions SECURITY DEFINER et RLS initplan à traiter progressivement.

## Fichiers concernés

- `supabase/migrations/20261116000000_add_missing_fk_indexes.sql`
- `supabase/migrations/20261116000001_fix_function_search_path.sql`
- `supabase/migrations/20261116000002_revoke_anon_on_sensitive_functions.sql`
- `BACKEND_MEMORY.md`

## Dernière action

2026-11-16 — Application des 3 migrations sur le projet Supabase + fichiers dans le dépôt.

## Prochaine étape

1. Vérifier les advisors après ces changements.
2. Continuer le durcissement sécurité (autres fonctions, policies RLS) ou le job de rappels push.
3. Corriger l'URL hardcodée si un moyen sûr est trouvé.

## Vérifications

- Index présents en base (requête pg_indexes confirmée).
- Migrations appliquées avec succès via apply_migration.
- Fichiers de migration relus distants (tailles 1017 / 475 / 445 octets).

## Points d'attention

- book_ticket et cancel_ticket ne sont plus appelables par anon (correct pour un flux authentifié).
- search_path fixé (réduit le risque d'injection de schéma).
- Conflit server.ts avec main toujours à arbitrer.

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts`.
2. Confirmation des variables d'environnement.
3. Validation continue pour d'autres durcissements (ex. autres SECURITY DEFINER).

## Historique

- 2026-11-16 — Migrations index + search_path + revoke anon appliquées et versionnées.

## Pour les autres automatisations

- Migrations appliquées sur `lwwiolbofrqakvrdvbbj`.
- Rollback documenté dans chaque fichier SQL.
