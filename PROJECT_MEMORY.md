# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P2 UI/UX — Localisation progressive des écrans clés (EventDetailScreen et ExploreScreen finalisés, prochain : NotificationsScreen).

## Objectifs

- Rendre l'application bilingue FR/EN pour les parcours principaux sans impacter la logique ou l'apparence.
- Améliorer la lisibilité et l'accessibilité de la navigation mobile et préserver le rendu des catégories.

## Progression

- Terminé :
  - Contraste des labels inactifs du dock amélioré en dark mode (`dark:text-gray-300` au lieu de `gray-500`), commit sur main `124e2504`.
  - Localisation de TicketsScreen et ProfileScreen (domaines `tickets` et `profile`), commits sur FRONTEND-iA dont `84f77531`.
  - Ajout de la section `detail` dans `src/locales/{fr,en}/events.json` (commits 93b89803, bb56f86d).
  - Localisation complète de EventDetailScreen.tsx : remplacement des chaînes en dur par `t('events', 'detail.*')`, clés supplémentaires ajoutées. Restauration du fichier tronqué depuis FRONTEND-iA.
  - Localisation complète de ExploreScreen : header, modes, placeholders, filtres, empty states événements + participants, sous-catégories "Toutes", labels follow/city/participant. Clés explore enrichies (commits 5a9a5308, 5a38d580, f85e7da4).
- En cours / restant :
  - Localisation de NotificationsScreen.
  - Vérification visuelle mobile 320px (catégories + dock).
  - Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.

## Fichiers concernés

- `src/screens/ExploreScreen.tsx`
- `src/locales/fr/events.json`
- `src/locales/en/events.json`
- `src/screens/EventDetailScreen.tsx`
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-23 — Localisation complète ExploreScreen (empty states participants, allSubcategories, follow, city, defaultParticipantLabel). Clés ajoutées FR/EN. Commit f85e7da4 sur main.

## Prochaine étape

1. Localiser NotificationsScreen (header, empty states, actions).
2. Revue mobile 320px des catégories et safe areas.
3. Confirmer le proxy Vercel AI et le secret webhook paiements.

## Vérifications

- Clés explore.searchPersonTitle, noParticipantsTitle, allSubcategories, defaultParticipantLabel, follow, following, city présentes et cohérentes FR/EN.
- Remplacements `t()` appliqués sur ExploreScreen sans modification de la logique métier.
- Aucune troncature constatée.

## Backlog

1. Localisation de NotificationsScreen.
2. Revue responsive 320px des catégories et safe areas du dock.
3. Confirmer le proxy Vercel AI et le secret webhook paiements.
4. Optionnel — stream token-par-token côté edge (SSE natif).

## Historique

- 2026-11-23 — Localisation complète ExploreScreen (participants + labels).
- 2026-11-22 — Restauration EventDetailScreen + localisation ExploreScreen (partielle).
- 2026-11-21 — Localisation complète EventDetailScreen (appels t() + clés enrichies).
- 2026-11-20 — Début localisation EventDetailScreen (ajout clés detail).
- 2026-11-18 — Localisation ProfileScreen et TicketsScreen.
- 2026-11-17 — Contraste labels dock mobile amélioré.
- 2026-11-16 — Edge ai-assistant v7 (retry modèles + text/content).
- 2026-11-16 — Correctifs client + route Vercel stream.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
