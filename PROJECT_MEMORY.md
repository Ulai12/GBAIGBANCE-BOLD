# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Aucune. Dernière tâche P2 terminée.

## Objectif

(N/A — choisir la prochaine du backlog)

## Progression

- Terminé : base silencieuse des alertes artistes au premier lancement.
- Restant : aucune pour cette tâche.

## Fichiers concernés

- `src/services/eventReminderService.ts`

## Dernière action

2026-11-16 — Base silencieuse : clé `gba_artist_alerts_baseline_done_v1`. Au premier passage, les dates déjà présentes sont enregistrées dans `gba_dispatched_artist_alerts_v1` sans notification. Ensuite seules les nouvelles dates alertent.

## Prochaine étape

Passer à la prochaine tâche du backlog (P3 : déployer l’edge function `ai-assistant`, ou autre priorité P2/P1 si émergente).

## Vérifications

- Logique pure côté localStorage, pas de changement de contrat d’API.
- Les tests `eventReminderRules.test.ts` n’ont pas besoin d’être modifiés (règles pures inchangées).
- Typecheck / tests automatisés non relancés dans cette session distante.

## Backlog

1. P3 — Déployer l’edge function `ai-assistant` (repli Haversine déjà dans le dépôt).
2. P4 — Autres optimisations UI/UX ou performance selon priorités.
3. P2 optionnel — Si besoin plus tard : réinitialiser la baseline quand l’utilisateur suit un nouvel artiste (actuellement la baseline est globale appareil).

## Historique

- 2026-11-16 — Base silencieuse pour les alertes « nouvelle date » artistes/festivals (éviter le spam du catalogue au premier lancement).
- 2026-11-16 — Respect de la préférence `event_reminders` dans le planificateur client de rappels 24h/2h. Lecture sans création de ligne, défaut activé.
- 2026-11-16 — Alertes « nouvelle date » planifiées dans `App.tsx` (immédiat, retour au premier plan, toutes les 15 min), y compris hors accueil. Les festivals suivis sont pris en compte. Requête catalogue ciblée `fetchPublishedEventsForFollows`.
- 2026-11-13 — Cœur Rust/Wasm (billets, finances, géoloc, recherche), quota IA et démarrage du serveur sur le port 3000. Vérifié alors : cargo 16 tests, lint, build, routes HTTP locales.
- 2026-11-13 — Repli `get_nearby_events` de l’edge function aligné sur Haversine. Tests catalogue : 9/9.
