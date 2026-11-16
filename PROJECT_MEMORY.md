# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Aucune. Assistant IA stabilisé (edge v7 + client fallback + proxy Vercel).

## Objectif

Rendre l’assistant IA utilisable en production et en local.

## Progression

- Terminé :
  - Modèles Gemini corrigés (`gemini-2.0-flash` / live `gemini-2.0-flash-live-001`).
  - `DEFAULT_SUPABASE_URL` + anon key alignés sur `lwwiolbofrqakvrdvbbj`.
  - Client `aiAssistantService` : SSE + JSON + fallback Edge Function.
  - Route Vercel `api/ai/assistant/stream.ts` (proxy vers edge + conversion SSE).
  - Edge `ai-assistant` **v7** : cascade de modèles + retry 503/429, lecture `text`/`content`, CORS élargi, tools + Haversine.
  - Test live edge OK (`gemini-2.5-flash`, HTTP 200).
- Restant : attendre le déploiement Vercel de `api/ai/assistant/stream.ts` pour éviter le 502 sur la route principale (le fallback edge couvre déjà).

## Fichiers concernés

- `server.ts`
- `src/services/aiAssistantService.ts`
- `api/ai/assistant/stream.ts`
- `supabase/functions/ai-assistant/index.ts`

## Dernière action

2026-11-16 — Edge v7 déployée + client/proxy commit main. Validation live edge réussie.

## Prochaine étape

1. Après merge/deploy Vercel : retester `/api/ai/assistant/stream`.
2. P4 UI/UX (dock mobile, débordements catégories 320px, contrastes) si IA stable en prod.

## Vérifications

- Edge live : `POST .../functions/v1/ai-assistant` → 200, texte + `model`.
- Prod Vercel route stream : encore 502 « function not found » tant que le fichier `api/ai/...` n’est pas déployé.
- Plus de `gemini-3.8` ni de projet `qbngq…` dans `server.ts`.

## Backlog

1. Confirmer le proxy Vercel après deploy.
2. P4 UI — dock mobile / safe areas / débordements libellés.
3. Optionnel — stream token-par-token côté edge (SSE natif).

## Historique

- 2026-11-16 — Edge ai-assistant v7 (retry modèles + text/content).
- 2026-11-16 — Correctifs client + route Vercel stream.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
