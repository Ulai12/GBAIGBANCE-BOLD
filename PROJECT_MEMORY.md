# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P4 Performance — Optimisation CSS (glass mobile, transitions, containment) terminée.

## Objectifs

- Réduire le coût GPU du `backdrop-filter` sur mobile.
- Éviter `transition: all` et les animations décoratives continues sur petits écrans.
- Préparer des utilitaires `content-visibility` / `contain` pour les listes longues.

## Progression

- Terminé :
  - CSS modularisé : `src/index.css` importe `theme-base`, `theme-components`, `theme-utilities`, `perf-mobile`.
  - Blur glass réduit (défaut + caps ≤640px / ≤400px).
  - Transitions chip/btn ciblées (plus de `transition: all`).
  - Data-saver élargi (désactive blur + anim lourdes).
  - Utilitaires `.gba-content-auto`, `.gba-contain-paint`, `.gba-gpu-layer`, `.gba-sticky-cta`.
- Incident : troncature temporaire de `index.css` pendant le push — restauré via modules.

## Fichiers concernés

- `src/index.css`
- `src/styles/theme-base.css`
- `src/styles/theme-components.css`
- `src/styles/theme-utilities.css`
- `src/styles/perf-mobile.css`
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-23 — Optimisation performances CSS + modularisation. Commits dont `61fa988e`.

## Prochaine étape

1. Brancher `.gba-content-auto` sur listes EventCard / Explore (petit commit dédié).
2. Confirmer proxy Vercel AI et secret webhook (propriétaire).

## Vérifications

- Fichiers styles présents sur main avec tailles non nulles.
- Entry `index.css` réimporte les 4 modules.

## Backlog

1. Appliquer `gba-content-auto` aux listes de cartes.
2. Confirmer le proxy Vercel AI et le secret webhook paiements.
3. Optionnel — stream token-par-token côté edge.

## Historique

- 2026-11-23 — Perf CSS (glass mobile + modularisation).
- 2026-11-23 — Polish BottomNav 320px.
- 2026-11-23 — Localisation NotificationsScreen + ExploreScreen.
