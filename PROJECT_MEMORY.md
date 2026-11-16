# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P1 — Respecter la préférence `event_reminders` avant d’envoyer un rappel 24 h / 2 h. Pas encore commencée.

## Objectif

Si l’utilisateur coupe « Rappel 24h & 2h » dans les réglages, `checkAndTriggerTicketReminders` ne doit plus afficher de toast ni de notification. Le réglage est aujourd’hui enregistré dans `notification_preferences` mais jamais lu par le planificateur.

## Progression

- Terminé : rien sur cette tâche.
- Restant : lire la préférence (sans créer de ligne par effet de bord à chaque cycle), court-circuiter l’envoi si elle est fausse, couvrir le cas par un test, ne pas bloquer les alertes artistes sur ce même interrupteur sauf si le produit le dit explicitement.

## Fichiers concernés

- `src/services/eventReminderService.ts`
- `src/features/notifications/service.ts`
- `src/screens/NotificationSettingsScreen.tsx`

## Dernière action

2026-11-16 — Planification des alertes artistes au démarrage, festivals suivis inclus. Rappels 24 h / 2 h inchangés dans leur fenêtre, relancés au retour au premier plan.

## Prochaine étape

Lire `event_reminders` dans `checkAndTriggerTicketReminders` et ne rien envoyer quand la préférence est désactivée.

## Vérifications

- `node --experimental-strip-types --test src/services/eventReminderRules.test.ts` : 3 tests, 0 échec.
- `tsc --noEmit -p tsconfig.app.json` : aucune erreur nouvelle dans les fichiers touchés. Erreurs déjà présentes ailleurs (`queries.ts` `selectPages`, `CreateEventWizardScreen.tsx`, `authState` possiblement nul dans `App.tsx` vers le succès de connexion).
- Déploiement edge et push application fermée : non faits.

## Backlog

1. P1 — Honorer `event_reminders` dans le planificateur client.
2. P3 — Déployer l’edge function `ai-assistant` (repli Haversine déjà dans le dépôt).
3. P2 — Ne pas notifier tout le catalogue suivi au premier lancement : poser une base silencieuse, puis n’alerter que les dates apparues ensuite.

## Historique

- 2026-11-16 — Alertes « nouvelle date » planifiées dans `App.tsx` (immédiat, retour au premier plan, toutes les 15 min), y compris hors accueil. Les festivals suivis sont pris en compte. Requête catalogue ciblée `fetchPublishedEventsForFollows`.
- 2026-11-13 — Cœur Rust/Wasm (billets, finances, géoloc, recherche), quota IA et démarrage du serveur sur le port 3000. Vérifié alors : cargo 16 tests, lint, build, routes HTTP locales.
- 2026-11-13 — Repli `get_nearby_events` de l’edge function aligné sur Haversine. Tests catalogue : 9/9.
