# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Brancher le quota IA `check_and_increment_ai_quota` sur `/api/ai/assistant/stream` dans `server.ts`.

## Objectif

Chaque appel du concierge (connecté ou invité) doit consommer le quota déjà défini en base, comme l’edge function, et refuser proprement au-delà de la limite.

## Progression

- Terminé : rien sur cette tâche. Le RPC et la migration existent ; le serveur Express ne les appelle pas.
- À faire : lire la migration et l’appel dans l’edge function, reproduire l’identité (JWT, pas un `userId` du corps), répondre 429, ajouter un test ciblé si le chemin est pur.

## Fichiers concernés

- `server.ts` (route `/api/ai/assistant/stream`)
- `supabase/functions/ai-assistant/index.ts` (référence d’appel déjà en place)
- `supabase/migrations/20260920000000_ai_rate_limits.sql`
- `supabase/migrations/20261110000001_server_quota_identity.sql`

## Dernière action

2026-11-12 — L’edge function utilisait encore `status = active` (absent du schéma : `pending` / `valid` / `used`) et une fenêtre de dates locale incomplète (`today` / `this_weekend` seulement, `setHours`). Elle partage maintenant `catalogDateWindow`, le libellé de statut et l’assainissement de recherche avec le serveur.

## Prochaine étape

Lire l’appel `check_and_increment_ai_quota` dans l’edge function et la migration d’identité serveur, puis le brancher sur `/api/ai/assistant/stream` sans faire confiance au corps de la requête.

## Vérifications

- `node --experimental-strip-types --test src/server/aiCatalog.test.ts` : 8 tests, 0 échec.
- `node --experimental-strip-types --check` sur `server.ts`, `src/server/aiCatalog.ts`, `supabase/functions/_shared/aiCatalog.ts` et `supabase/functions/ai-assistant/index.ts` : syntaxe OK.
- Pas de `npm run typecheck` : les dépendances du dépôt ne sont pas installées dans cette session.
- Pas de vérification RLS réelle (pas de session Supabase dans cette session).

## Backlog

1. P1 — Brancher le quota `check_and_increment_ai_quota` sur `/api/ai/assistant/stream` (tâche active).
2. P1 — Le repli GPS de l’edge function `get_nearby_events` renvoie encore les premiers événements publiés sans Haversine quand le RPC échoue. Le serveur filtre déjà par distance.
3. P2 — Le repli hors-ligne de `src/features/tickets/service.ts` crée encore des billets locaux `pay_*` / `tkt_*` quand le RPC est absent.
4. P3 — Rappels 24 h / 2 h et alertes artistes suivis, si le service push n’est pas encore branché au démarrage de l’app.

## Historique

- 2026-11-12 — Alignement edge function : billets `pending`/`valid`/`used`, fenêtre de dates partagée (`supabase/functions/_shared/aiCatalog.ts`), recherche assainie.
- 2026-11-11 — Création de cette mémoire. Correction des outils catalogue et identité du concierge serveur.
- 2026-11-10 — Migration du streaming IA vers `server.ts` (commit `5c6748d`). Cette migration est l’origine de la régression corrigée le 11.
