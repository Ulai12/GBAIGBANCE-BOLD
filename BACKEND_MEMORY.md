# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.  
À lire en entier au début de chaque session. Mise à jour à la fin (protocole de sécurité d'écriture).

## Tâche active

Session 3 (2026-11-16) — P1 liaison Supabase. server.ts restauré.

## Objectif

Rendre le backend cohérent, sûr et bien rangé (API Node/Express, Edge Functions, Supabase, liaisons front↔back) sans rien casser. Une amélioration significative par jour, rétrocompatible.

## Progression

- Termine :
  - Audit léger session 1.
  - Identification projet Supabase actif `lwwiolbofrqakvrdvbbj`.
  - Restauration de `server.ts` (commit b1ad8dd, blob f71cda46, 30154 octets).
- En cours :
  - Correction URL + retrait clé hardcodée dans `server.ts` (maintenant possible par petites modifications).

## Fichiers concernés

- `BACKEND_MEMORY.md`
- `server.ts` (restauré)

## Dernière action

2026-11-16 — Restauration confirmée de server.ts depuis le blob sain. Taille distante 30154 octets.

## Prochaine étape

1. Corriger DEFAULT_SUPABASE_URL et retirer toute clé hardcodée par modifications ciblées.
2. Vérifier les Edge Functions et RLS.

## Vérifications

- server.ts restauré et relu : taille 30154 octets, contenu réel.

## Cartographie des données (initiale)

(inchangée depuis session 1)

## Points d'attention immédiats

- DEFAULT_SUPABASE_URL pointe encore vers l'ancien projet.
- Conflit potentiel avec main sur server.ts toujours à arbitrer par le propriétaire.

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts` avec `main`.
2. Confirmation des variables d'environnement Supabase réelles.

## Incidents

- 2026-11-15 : troncature de `server.ts` via connecteur. Restauration manuelle effectuée le 2026-11-16.

## Historique

- 2026-11-15 — Session 1 : création BACKEND_MEMORY.md, audit léger.
- 2026-11-15 — Session 2 : incident de troncature sur server.ts.
- 2026-11-16 — Restauration de server.ts.

## Pour les autres automatisations

- Projet Supabase de référence : `lwwiolbofrqakvrdvbbj`.
- server.ts est restauré ; les écritures longues restent risquées (préférer les diffs ciblés).

## Tâches À faire (pour l'automatisation backend)

- P1 : Corriger l'URL Supabase hardcodée dans server.ts (DEFAULT_SUPABASE_URL) et s'assurer qu'aucune clé n'est exposée. Utiliser des variables d'environnement.
- P2 : Auditer les Edge Functions pour cohérence avec le projet lwwiolbofrqakvrdvbbj.
- P2 : Vérifier que les RLS sont intactes après toute modification.
- Note : incident de placeholder sur TicketsScreen.tsx le 2026-11-16 (connecteur frontend) ; ne pas toucher ce fichier.
