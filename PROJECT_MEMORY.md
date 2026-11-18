# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P2 UI/UX — Localisation progressive des écrans clés (ProfileScreen terminé).

## Objectif

Rendre l'application bilingue FR/EN pour les parcours principaux (billets, profil, détails événement, etc.) sans impacter la logique ou l'apparence.

## Progression

- Terminé :
  - Localisation TicketsScreen (domain tickets).
  - Localisation ProfileScreen (domain profile) : tous les textes, toasts, modales, onglets.
  - Commits sur FRONTEND-iA : 84f77531 et précédents pour les JSON/index.
- En cours / restant :
  - Localisation EventDetailScreen et autres écrans.
  - Vérification visuelle mobile FR/EN.

## Fichiers concernés

- `src/screens/ProfileScreen.tsx`
- `src/locales/fr/profile.json`, `src/locales/en/profile.json`
- `src/locales/index.ts`
- `FRONTEND_MEMORY.md`
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-18 — Localisation complète de ProfileScreen vers le domaine profile (FR/EN). Commit `84f77531`.

## Prochaine étape

1. Identifier et localiser les chaînes hardcodées dans EventDetailScreen.tsx.
2. Créer domain events ou étendre si nécessaire.
3. Mettre à jour les mémoires.

## Vérifications

- Appels t('profile', ...) présents dans ProfileScreen.
- Placeholders et pluriels gérés via replace.
- Aucune troncature constatée.
- Section catégories gelée non touchée.

## Backlog

1. Localisation EventDetailScreen.
2. Localisation autres écrans (Explore, Notifications, etc.).
3. Confirmer proxy Vercel AI et secret webhook paiements.
4. Revue responsive 320px.

## Historique

- 2026-11-18 — Localisation ProfileScreen.
- 2026-11-18 — Localisation TicketsScreen.
- 2026-11-17 — Contraste labels dock (sur main).
- 2026-11-16 — Edge AI v7, alertes, rappels.
