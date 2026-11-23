# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P2 UI/UX — Polish responsive mobile 320px (dock terminé ; catégories Explore déjà en scroll horizontal).

## Objectifs

- Rendre l'application bilingue FR/EN pour les parcours principaux sans impacter la logique ou l'apparence.
- Améliorer la lisibilité et l'accessibilité de la navigation mobile et préserver le rendu des catégories.

## Progression

- Terminé :
  - Contraste des labels inactifs du dock amélioré en dark mode (`dark:text-gray-300`), commit `124e2504`.
  - Localisation TicketsScreen, ProfileScreen, EventDetailScreen, ExploreScreen, NotificationsScreen.
  - Polish BottomNav 320px : padding réduit (`px-2` sous 360px), labels `10px`→`11px`, bouton Créer `40px`→`44px` (commit `b19ad435`).
- En cours / restant :
  - Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.
  - Optionnel : revue visuelle catégories Explore sur 320px (déjà snap-x + min-h-11).

## Fichiers concernés

- `src/components/BottomNav.tsx`
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-23 — Polish responsive BottomNav pour largeurs ≤320–360px (grille 5 colonnes). Commit `b19ad435` sur main.

## Prochaine étape

1. Confirmer le proxy Vercel AI et le secret webhook paiements (actions propriétaire).
2. Optionnel — localiser d'autres écrans ou polish fin catégories si besoin.

## Vérifications

- Zones tactiles conservées ≥ 44px (min-h buttons).
- Labels dock tronqués proprement, pas de débordement attendu en 5 cols sur 320px.
- Safe-area-inset-bottom inchangé.

## Backlog

1. Confirmer le proxy Vercel AI et le secret webhook paiements.
2. Optionnel — stream token-par-token côté edge (SSE natif).
3. Localisation progressive d'autres écrans si nécessaire.

## Historique

- 2026-11-23 — Polish BottomNav 320px.
- 2026-11-23 — Localisation complète NotificationsScreen.
- 2026-11-23 — Localisation complète ExploreScreen (participants + labels).
- 2026-11-22 — Restauration EventDetailScreen + localisation ExploreScreen (partielle).
- 2026-11-21 — Localisation complète EventDetailScreen.
- 2026-11-18 — Localisation ProfileScreen et TicketsScreen.
- 2026-11-17 — Contraste labels dock mobile amélioré.
