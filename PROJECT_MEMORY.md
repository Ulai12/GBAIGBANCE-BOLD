# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Réparer les outils du concierge IA après la migration serveur (`server.ts`).

## Objectif

Le concierge ne doit répondre sur le catalogue qu’avec des filtres réels (dates, proximité) et ne lire les billets, favoris et profil que via le JWT Supabase de la personne connectée, sans QR code.

## Progression

- Terminé : filtres de dates, assainissement de la recherche, proximité (RPC puis repli Haversine), favoris sur `event_likes`, billets sans `qr_code`, identité lue depuis `Authorization`.
- Terminé : le client n’envoie plus un `userId` falsifiable.
- Restant : rien sur cette tâche. Prochaine priorité dans le backlog.

## Fichiers concernés

- `server.ts`
- `src/server/aiCatalog.ts`
- `src/server/aiCatalog.test.ts`
- `src/services/aiAssistantService.ts`
- `src/services/gemini.ts`
- Référence encore correcte côté edge : `supabase/functions/ai-assistant/index.ts`

## Dernière action

2026-11-11 — Les outils du serveur IA ignoraient `date_range` et le GPS, lisaient la table inexistante `user_favorites`, et demandaient les billets avec la clé anonyme en faisant confiance au `userId` du corps. Le serveur s’aligne maintenant sur le JWT et les filtres du catalogue.

## Prochaine étape

Vérifier en conditions réelles, avec une session connectée, que « mes billets » et « mes favoris » renvoient les lignes RLS. Ensuite : P1 restant, le filtre `status = active` encore présent dans l’edge function `get_my_tickets` (les statuts réels sont `pending` / `valid` / `used`).

## Vérifications

- `node --experimental-strip-types --test src/server/aiCatalog.test.ts` : 7 tests, 0 échec.
- `node --experimental-strip-types --check server.ts` : syntaxe OK.
- Pas de `npm run typecheck` complet : les dépendances du dépôt ne sont pas installées dans cette session.

## Backlog

1. P1 — Aligner `supabase/functions/ai-assistant/index.ts` : billets `valid`/`used`/`pending` au lieu de `active`, et même fenêtre de dates que `src/server/aiCatalog.ts`.
2. P1 — Brancher le quota `check_and_increment_ai_quota` sur `/api/ai/assistant/stream` (la migration existe, le nouveau serveur ne l’appelle pas).
3. P2 — Le repli hors-ligne de `src/features/tickets/service.ts` crée encore des billets locaux `pay_*` / `tkt_*` quand le RPC est absent.
4. P3 — Rappels 24 h / 2 h et alertes artistes suivis, si le service push n’est pas encore branché au démarrage de l’app.

## Historique

- 2026-11-11 — Création de cette mémoire. Correction des outils catalogue et identité du concierge serveur.
- 2026-11-10 — Migration du streaming IA vers `server.ts` (commit `5c6748d`). Cette migration est l’origine de la régression corrigée aujourd’hui.
