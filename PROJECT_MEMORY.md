# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P1 — Repli GPS Haversine de `get_nearby_events` (edge function) : terminé dans le dépôt. Le déploiement Supabase de la fonction n’a pas été lancé (pas de CI).

## Objectif

Quand `get_nearby_events_rpc` échoue, l’assistant ne doit plus renvoyer les premiers événements publiés. Le repli doit appliquer la même distance Haversine que le serveur Node, et ne garder que les événements dans le rayon.

## Progression

- Terminé :
  1. Le repli de `supabase/functions/ai-assistant/index.ts` charge des événements publiés, géolocalisés et encore à venir (fenêtre alignée sur le serveur : `starts_at` ≥ maintenant − 6 h, 80 candidats les plus proches dans le temps).
  2. `withinRadius` (`supabase/functions/_shared/aiCatalog.ts`) filtre et trie par distance. Un catalogue hors rayon renvoie une liste vide, pas un dump.
  3. La réponse de repli inclut `distance` et `radius_km`. Une erreur de requête renvoie une erreur explicite au lieu d’une liste trompeuse.
  4. Le succès RPC inchangé : une liste vide valide n’est pas remplacée par le repli.
- Restant : déployer l’edge function `ai-assistant` sur Supabase pour que la prod prenne le correctif.

## Fichiers concernés

- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/_shared/aiCatalog.ts`
- `src/server/aiCatalog.test.ts`
- `server.ts` (repli Node déjà en place, non modifié)

## Dernière action

2026-11-13 — Repli GPS de l’edge function branché sur `withinRadius` / `haversineKm`, au lieu des premiers événements publiés.

## Prochaine étape

P2 — Vérifier dans `src/screens/HomeScreen.tsx`, `src/services/eventReminderService.ts` et `src/services/pushNotificationService.ts` si les rappels 24 h / 2 h et `checkFollowedArtistsNewDates` sont vraiment planifiés au démarrage. Brancher uniquement ce qui manque.

## Vérifications

- `node --experimental-strip-types --test src/server/aiCatalog.test.ts` : 9 tests, 0 échec (nouveau cas : hors rayon → liste vide).
- Déploiement edge et appel HTTP réel de l’outil : non faits cette session.

## Backlog

1. P2 — Rappels 24 h / 2 h et alertes artistes suivis, si le service push n’est pas encore branché au démarrage de l’app.
2. P3 — Déployer l’edge function `ai-assistant` après relecture du correctif Haversine.

## Historique

- 2026-11-13 — Cœur Rust/Wasm (billets, finances, géoloc, recherche), quota IA et démarrage du serveur sur le port 3000. Vérifié alors : cargo 16 tests, lint, build, routes HTTP locales.
- 2026-11-13 — Repli `get_nearby_events` de l’edge function aligné sur Haversine. Tests catalogue : 9/9.
