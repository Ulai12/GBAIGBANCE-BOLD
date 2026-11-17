# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P4 UI/UX — Améliorations dock mobile et contrastes.

## Objectif

Améliorer la lisibilité et l’accessibilité de la navigation mobile (dock) et des catégories sur petits écrans.

## Progression

- Terminé :
  - Contraste des labels inactifs du dock amélioré en dark mode (`dark:text-gray-300` au lieu de `gray-500`).
  - Commit direct sur main : `124e2504`.
- En cours / restant :
  - Vérifier visuellement le rendu sur 320px (catégories + dock).
  - Éventuels ajustements supplémentaires de safe-area ou débordements si constatés.
  - Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.

## Fichiers concernés

- `src/components/BottomNav.tsx`
- `src/screens/HomeScreen.tsx` (section catégories)
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-17 — Amélioration du contraste des micro-labels du dock mobile en mode sombre. Commit `124e2504`.

## Prochaine étape

1. Revue visuelle ciblée sur mobile 320px (dock + explorateur de catégories).
2. Si nécessaire, ajuster `line-clamp` ou tailles de texte des shortLabels de catégories.
3. Confirmer le déploiement de la route Vercel AI stream.

## Vérifications

- Changement de classes Tailwind uniquement (aucun impact logique).
- Labels inactifs plus lisibles en dark (`gray-300` vs précédent `gray-500`).
- Hover encore plus contrasté.
- Aucune troncature de fichier constatée.

## Backlog

1. Confirmer le proxy Vercel AI après deploy.
2. P4 — revue responsive 320px catégories + safe areas dock.
3. Optionnel — stream token-par-token côté edge (SSE natif).

## Historique

- 2026-11-17 — Contraste labels dock mobile amélioré.
- 2026-11-16 — Edge ai-assistant v7 (retry modèles + text/content).
- 2026-11-16 — Correctifs client + route Vercel stream.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
