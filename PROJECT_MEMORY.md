# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Aucune. Dernière tâche P1 terminée.

## Objectif

(N/A — choisir la prochaine du backlog)

## Progression

- Terminé : lecture de `event_reminders` sans effet de bord, court-circuit si désactivé.
- Restant : aucune pour cette tâche.

## Fichiers concernés

- `src/services/eventReminderService.ts`

## Dernière action

2026-11-16 — Ajout de `areEventRemindersEnabled` (lecture seule, défaut true) et court-circuit dans `checkAndTriggerTicketReminders`. Les alertes artistes ne sont pas affectées.

## Prochaine étape

Passer à la prochaine tâche du backlog (P2 : base silencieuse pour les alertes artistes au premier lancement).

## Vérifications

- Modification ciblée, logique simple. Typecheck non relancé dans cette session (environnement distant).
- Les tests existants de règles n’ont pas été touchés.

## Backlog

1. P2 — Ne pas notifier tout le catalogue suivi au premier lancement : poser une base silencieuse, puis n’alerter que les dates apparues ensuite.
2. P3 — Déployer l’edge function `ai-assistant` (repli Haversine déjà dans le dépôt).
3. P4 — Autres optimisations UI/UX ou performance selon priorités.

## Historique

- 2026-11-16 — Respect de la préférence `event_reminders` dans le planificateur client de rappels 24h/2h. Lecture sans création de ligne, défaut activé.
- 2026-11-16 — Alertes « nouvelle date » planifiées dans `App.tsx` (immédiat, retour au premier plan, toutes les 15 min), y compris hors accueil. Les festivals suivis sont pris en compte. Requête catalogue ciblée `fetchPublishedEventsForFollows`.
- 2026-11-13 — Cœur Rust/Wasm (billets, finances, géoloc, recherche), quota IA et démarrage du serveur sur le port 3000. Vérifié alors : cargo 16 tests, lint, build, routes HTTP locales.
- 2026-11-13 — Repli `get_nearby_events` de l’edge function aligné sur Haversine. Tests catalogue : 9/9.
