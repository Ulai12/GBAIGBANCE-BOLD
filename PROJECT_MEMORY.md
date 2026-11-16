# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Aucune. Dernière tâche P4 (assistant IA) en cours de stabilisation.

## Objectif

Rendre l’assistant IA utilisable en production et en local.

## Progression

- Terminé :
  - Modèles Gemini corrigés (`gemini-2.0-flash` / live `gemini-2.0-flash-live-001`).
  - `DEFAULT_SUPABASE_URL` + anon key alignés sur `lwwiolbofrqakvrdvbbj`.
  - Client `aiAssistantService` : SSE + JSON + fallback Edge Function.
  - Route Vercel `api/ai/assistant/stream.ts` (proxy vers edge + conversion SSE).
- Restant : valider un appel réel avec `GEMINI_API_KEY` côté prod / edge.

## Fichiers concernés

- `server.ts`
- `src/services/aiAssistantService.ts`
- `api/ai/assistant/stream.ts`

## Dernière action

2026-11-16 — Correctifs assistant IA (modèles, credentials, fallback edge, route Vercel).

## Prochaine étape

Tester l’assistant sur l’app déployée ; si edge échoue sans clé Gemini, vérifier les secrets Supabase (`GEMINI_API_KEY`).

## Vérifications

- Grep local : plus de `gemini-3.8` ni de projet Supabase `qbngq…` dans `server.ts`.
- Appel HTTP live non exécuté ici.

## Backlog

1. Valider end-to-end l’assistant (prod Vercel + local).
2. Optionnel — Resynchroniser le body edge long (stream token-par-token).
3. P4 UI — autres finitions si IA stable.

## Historique

- 2026-11-16 — Correctifs assistant IA (P4 / fiabilité).
- 2026-11-16 — Déploiement edge `ai-assistant` v5.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
