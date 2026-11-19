# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P2 UI/UX — Localisation progressive des écrans clés (ProfileScreen terminé) et P4 UI/UX — Améliorations du dock mobile et des contrastes.

## Objectifs

- Rendre l'application bilingue FR/EN pour les parcours principaux sans impacter la logique ou l'apparence.
- Améliorer la lisibilité et l'accessibilité de la navigation mobile et préserver le rendu des catégories.

## Progression

- Terminé :
  - Contraste des labels inactifs du dock amélioré en dark mode (`dark:text-gray-300` au lieu de `gray-500`), commit sur main `124e2504`.
  - Localisation de TicketsScreen et ProfileScreen (domaines `tickets` et `profile`), commits sur FRONTEND-iA dont `84f77531`.
- En cours / restant :
  - Vérifier visuellement le rendu sur 320px (catégories + dock).
  - Éventuels ajustements supplémentaires de safe-area ou débordements si constatés.
  - Localisation EventDetailScreen et autres écrans.
  - Vérification visuelle mobile FR/EN.
  - Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.

## Fichiers concernés

- `src/components/BottomNav.tsx`
- `src/screens/HomeScreen.tsx` (section catégories)
- `src/screens/ProfileScreen.tsx`
- `src/locales/fr/profile.json`, `src/locales/en/profile.json`
- `src/locales/index.ts`
- `FRONTEND_MEMORY.md`
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-18 — Localisation complète de ProfileScreen vers le domaine profile (FR/EN), commit `84f77531`; le contraste des micro-labels du dock mobile a été amélioré sur main (`124e2504`).

## Prochaine étape

1. Identifier et localiser les chaînes encore présentes dans EventDetailScreen.tsx et les autres écrans.
2. Vérifier visuellement les écrans localisés en FR/EN.
3. Revue mobile 320px du dock et de l'explorateur de catégories; ajuster uniquement si un défaut est observé.
4. Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.

## Vérifications

- Localisation `t('profile', ...)` présente; placeholders et pluriels gérés avec replace.
- Contraste sombre amélioré (`gray-300` au lieu de `gray-500`); changement Tailwind sans impact logique.
- Aucune troncature de fichier constatée; la section catégories reste gelée.

## Backlog

1. Localisation EventDetailScreen et autres écrans (Explore, Notifications, etc.).
2. Revue responsive 320px des catégories et safe areas du dock.
3. Confirmer le proxy Vercel AI et le secret webhook paiements.
4. Optionnel — stream token-par-token côté edge (SSE natif).

## Historique

- 2026-11-18 — Localisation ProfileScreen et TicketsScreen.
- 2026-11-17 — Contraste labels dock mobile amélioré.
- 2026-11-16 — Edge ai-assistant v7 (retry modèles + text/content).
- 2026-11-16 — Correctifs client + route Vercel stream.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
