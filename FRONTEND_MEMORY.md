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


## 2026-11-23 — Localisation du tableau de bord organisateur (FR/EN)
- Localisé les libellés du `OrganizerDashboardScreen` : titres, onglets, états d'événement, formulaire, scanner, modales, messages toast et erreurs de chargement.
- Ajout des ressources `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`, enregistrées dans `src/locales/index.ts`.
- Ajout d'un `aria-label` traduit au bouton icône de création; le lieu par défaut suit désormais la langue active.
- Aucun changement backend/API, données métier, dépendance, parcours de catégories ou autre écran.

Fichiers : `src/screens/OrganizerDashboardScreen.tsx`, `src/locales/index.ts`, nouveaux JSON FR/EN, `FRONTEND_MEMORY.md`.

Vérifications : contrôle statique des références et clés de traduction effectué; JSON sérialisé/parsable. Typecheck, lint, build et rendu navigateur non exécutés. Les composants enfants (`OrganizerMetricsChart`, `OrganizerRefundsTab`, `TicketScannerModal`, `EventManagementModal`) peuvent encore avoir des libellés à localiser.

Prochaine priorité : localiser progressivement ces composants enfants et harmoniser les états loading/empty, sans modifier Explorer par catégorie.
