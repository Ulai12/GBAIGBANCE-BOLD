# FRONTEND_MEMORY.md — Mémoire frontend

## Règles permanentes
- Branche Git unique : `FRONTEND-iA`.
- Après chaque commit : relecture distante + tailles. Rétrécissement >20 % non voulu → ARRÊT + restauration.
- Fichiers >25 ko : risque de troncature via connecteur ; préférer git local / API complète.

## Projet
- Dépôt : https://github.com/Ulai12/GBAIGBANCE-BOLD
- Branche : `FRONTEND-iA`
- Stack : React 18, TypeScript, Vite, Tailwind, Supabase `lwwiolbofrqakvrdvbbj`.

## Tâche active (23 novembre 2026) — RÉSOLUE P0
**Restauration `src/locales/fr/events.json` et `src/locales/en/events.json` COMPLÉTÉE**

### État
- Fichiers restaurés depuis commit sain `8ce468fdf13e794d781188a05d3924f8e8ab0ac2`.
- Tailles distantes confirmées : FR 42191 octets, EN 37953 octets.
- Commits de restauration : 0ba2c844 (FR), 387eb3e3 (EN).

### Prochaine étape
- Localisation progressive OrganizerDashboardScreen par petits commits.
- Merger les localisations récentes de main si nécessaire.

## Incidents
- 2026-11-23 : events.json tronqués/PLACEHOLDER. Résolu par restauration API directe.

## Backlog
P1 : i18n OrganizerDashboard (petits commits).
P2 : États loading/empty.
