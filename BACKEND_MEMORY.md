# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.  
À lire en entier au début de chaque session. Mise à jour à la fin (protocole de sécurité d'écriture).

## Tâche active

Session 2 (2026-11-15) — P1 liaison Supabase. Bloquée par incident de troncature.

## Objectif

Rendre le backend cohérent, sûr et bien rangé (API Node/Express, Edge Functions, Supabase, liaisons front↔back) sans rien casser. Une amélioration significative par jour, rétrocompatible.

## Progression

- Termine :
  - Audit léger session 1.
  - Identification projet Supabase actif `lwwiolbofrqakvrdvbbj`.
- En cours / bloqué :
  - Correction URL + retrait clé hardcodée dans `server.ts` → incident de troncature.

## Fichiers concernés

- `BACKEND_MEMORY.md`
- `server.ts` (actuellement tronqué — à restaurer)

## Dernière action

2026-11-15 — Tentative de fix sur `server.ts` (URL + clé). Connecteur a écrit un contenu tronqué (23 o puis 4512 o au lieu de ~30154). Restauration partielle tentée, fichier toujours incomplet.

## Prochaine étape

1. Restaurer `server.ts` depuis le commit sain `852146e` (taille 30154 octets).
2. Une fois restauré, reprendre la correction de la liaison Supabase par petites modifications ou via un moyen qui évite la troncature de fichiers longs.

## Vérifications

- Incident confirmé par relecture distante.
- Dernière version saine connue : commit `852146e`, blob `f71cda46…`, 30154 octets.

## Cartographie des données (initiale)

(inchangée depuis session 1)

## Points d'attention immédiats

- `server.ts` est actuellement tronqué sur `FRONTEND-iA`. Ne plus écrire dessus tant qu'il n'est pas restauré.
- DEFAULT_SUPABASE_URL pointe encore vers l'ancien projet.

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Restaurer `server.ts` depuis `852146e` sur `FRONTEND-iA`.
2. Décision sur le conflit `server.ts` avec `main`.
3. Confirmation des variables d'environnement Supabase réelles.

## Incidents

- 2026-11-15 : troncature de `server.ts` via connecteur GitHub lors d'une mise à jour (contenu long). Fichier distant réduit de >20 %. Protocole appliqué : arrêt des écritures sur ce fichier, consignation. Restauration manuelle requise.

## Historique

- 2026-11-15 — Session 1 : création BACKEND_MEMORY.md, audit léger.
- 2026-11-15 — Session 2 : incident de troncature sur server.ts.

## Pour les autres automatisations

- Ne pas modifier `server.ts` tant que l'incident n'est pas résolu.
- Projet Supabase de référence : `lwwiolbofrqakvrdvbbj`.
