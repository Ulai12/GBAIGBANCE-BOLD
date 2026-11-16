# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.

## Tâche active

Session 5 (2026-11-16) — Configuration des jobs cron pour les rappels d'événements.

## Objectif

Rendre le backend cohérent, sûr et bien rangé sans rien casser.

## Progression

- Termine :
  - Extensions pg_cron et pg_net activées.
  - Edge Function `event-reminders` déployée (rappels 24h/2h, respecte `event_reminders`).
  - Job cron `event-reminders-hourly` planifié (toutes les heures, jobid 1).
  - Source de la fonction versionnée dans le dépôt.
- En cours :
  - Push réel (VAPID / service worker) non encore branché ; pour l'instant insertion dans `notifications`.
  - DEFAULT_SUPABASE_URL toujours à corriger.

## Fichiers concernés

- `supabase/functions/event-reminders/index.ts`
- `BACKEND_MEMORY.md`

## Dernière action

2026-11-16 — Déploiement Edge Function + cron.schedule('event-reminders-hourly', '0 * * * *', ...).

## Prochaine étape

1. Tester manuellement l'Edge Function.
2. Brancher l'envoi push réel si les clés sont disponibles.
3. Ajouter d'autres jobs (ex. nettoyage, stats) si besoin.

## Vérifications

- Extensions présentes.
- Job cron listé dans cron.job (jobid 1, schedule '0 * * * *').
- Fonction ACTIVE sur Supabase.
- Fichier source relu distant (SHA b2023c87…, 2447 octets).

## Points d'attention

- Le job appelle la fonction sans JWT (verify_jwt=false). À sécuriser plus tard si nécessaire.
- Respecte `notification_preferences.event_reminders`.
- Évite les doublons de notifications.

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts`.
2. Confirmation des variables d'environnement (service role pour la fonction).
3. Validation pour brancher le push réel.

## Historique

- 2026-11-16 — Job cron rappels configuré.

## Pour les autres automatisations

- Edge Function : `event-reminders` sur `lwwiolbofrqakvrdvbbj`.
- Cron : `event-reminders-hourly` toutes les heures.

## Tâches À faire

- [Automatisation client / PROJECT_MEMORY] 2026-11-16 : Le planificateur client de rappels 24h/2h respecte désormais `event_reminders` (commit 2a8a5c8 sur main). Vérifier la cohérence avec l'Edge Function `event-reminders` (pas de doublon de logique, mêmes fenêtres de temps si applicable). Aucun problème détecté côté client.
