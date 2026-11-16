# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Aucune. Dernière tâche P3 terminée (déploiement edge).

## Objectif

(N/A — choisir la prochaine du backlog)

## Progression

- Terminé : edge function `ai-assistant` ACTIVE version 5 sur projet `lwwiolbofrqakvrdvbbj`.
- `verify_jwt = false` (aligné config.toml du dépôt).
- Outils : search_events, get_event_details, get_nearby_events (RPC + repli Haversine), profil/favoris/billets.
- Note : version compacte déployée (source dépôt trop volumineuse pour un push unique via connecteur). Le client principal passe par `/api/ai/assistant/stream` (server.ts), pas directement l’edge.

## Fichiers concernés

- Edge remote : `ai-assistant` (Supabase)
- Source dépôt : `supabase/functions/ai-assistant/index.ts`, `_shared/aiCatalog.ts`

## Dernière action

2026-11-16 — Redéploiement `ai-assistant` v5 avec repli Haversine et outils catalogue. Incident placeholder v3 corrigé (v4 maintenance puis v5).

## Prochaine étape

P4 ou : réaligner le body edge sur le fichier long du dépôt (streaming Gemini natif) via CLI Supabase si besoin ; sinon optimisations UI/UX.

## Vérifications

- `list_edge_functions` : ai-assistant ACTIVE v5, verify_jwt false.
- Contenu distant relu : contient haversineKm / withinRadius / get_nearby_events.
- Appel HTTP live non testé dans cette session.

## Backlog

1. P4 — Optimisations UI/UX ou performance selon priorités.
2. Optionnel — Resynchroniser le code edge avec le fichier long du dépôt (SSE Gemini stream token-par-token) via `supabase functions deploy`.
3. P2 optionnel — Baseline alertes par artiste (actuellement globale appareil).

## Historique

- 2026-11-16 — Déploiement edge `ai-assistant` v5 (Haversine + outils).
- 2026-11-16 — Base silencieuse pour les alertes « nouvelle date » artistes/festivals.
- 2026-11-16 — Respect de la préférence `event_reminders` dans le planificateur client de rappels 24h/2h.
- 2026-11-16 — Alertes « nouvelle date » planifiées dans `App.tsx`.
- 2026-11-13 — Cœur Rust/Wasm, quota IA, serveur port 3000.
- 2026-11-13 — Repli Haversine dans le code source edge (dépôt).
