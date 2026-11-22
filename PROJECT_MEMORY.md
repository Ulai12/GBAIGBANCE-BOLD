# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

P2 UI/UX — Localisation progressive des écrans clés (EventDetailScreen restaurée et finalisée, ExploreScreen en cours).

## Objectifs

- Rendre l'application bilingue FR/EN pour les parcours principaux sans impacter la logique ou l'apparence.
- Améliorer la lisibilité et l'accessibilité de la navigation mobile et préserver le rendu des catégories.

## Progression

- Terminé :
  - Contraste des labels inactifs du dock amélioré en dark mode (`dark:text-gray-300` au lieu de `gray-500`), commit sur main `124e2504`.
  - Localisation de TicketsScreen et ProfileScreen (domaines `tickets` et `profile`), commits sur FRONTEND-iA dont `84f77531`.
  - Ajout de la section `detail` dans `src/locales/{fr,en}/events.json` (commits 93b89803, bb56f86d).
  - Localisation complète de EventDetailScreen.tsx : remplacement des chaînes en dur par `t('events', 'detail.*')`, clés supplémentaires ajoutées. Restauration du fichier tronqué depuis FRONTEND-iA.
  - Début localisation ExploreScreen : header, modes recherche, placeholders, filtres principaux, empty states. Clés explore enrichies.
- En cours / restant :
  - Vérifier le typecheck et le rendu FR/EN sur EventDetailScreen.
  - Localisation des autres écrans (Explore, Notifications, etc.).
  - Vérification visuelle mobile 320px (catégories + dock).
  - Confirmer le proxy Vercel `/api/ai/assistant/stream` après déploiement.

## Fichiers concernés

- `src/screens/EventDetailScreen.tsx`
- `src/locales/fr/events.json`
- `src/locales/en/events.json`
- `src/components/BottomNav.tsx`
- `src/screens/HomeScreen.tsx` (section catégories)
- `PROJECT_MEMORY.md`

## Dernière action

2026-11-22 — Restauration EventDetailScreen.tsx (tronqué en placeholder sur main) depuis FRONTEND-iA. Localisation progressive ExploreScreen (header, segmented control, search, filters, empty states). Clés explore ajoutées FR/EN.

## Prochaine étape

1. Vérifier le typecheck sur ExploreScreen et EventDetailScreen.
2. Finir les chaînes restantes d'ExploreScreen (empty states participants, aria dynamiques, etc.).
3. Continuer avec NotificationsScreen.
4. Revue mobile 320px.
5. Confirmer le proxy Vercel AI et le secret webhook paiements.

## Vérifications

- Section `detail` présente et cohérente dans fr/events.json et en/events.json (33 clés).
- Les chaînes identifiées dans EventDetailScreen (toasts, status, dates, aria, boutons, labels de section) ont des clés correspondantes.
- Aucune troncature constatée sur les fichiers JSON.
- Remplacements `t()` appliqués de façon ciblée sans modification de la logique métier.

## Backlog

1. Localisation des écrans suivants (Explore, Notifications, etc.).
2. Revue responsive 320px des catégories et safe areas du dock.
3. Confirmer le proxy Vercel AI et le secret webhook paiements.
4. Optionnel — stream token-par-token côté edge (SSE natif).

## Historique

- 2026-11-22 — Restauration EventDetailScreen + localisation ExploreScreen (partielle).
- 2026-11-21 — Localisation complète EventDetailScreen (appels t() + clés enrichies).
- 2026-11-20 — Début localisation EventDetailScreen (ajout clés detail).
- 2026-11-18 — Localisation ProfileScreen et TicketsScreen.
- 2026-11-17 — Contraste labels dock mobile amélioré.
- 2026-11-16 — Edge ai-assistant v7 (retry modèles + text/content).
- 2026-11-16 — Correctifs client + route Vercel stream.
- 2026-11-16 — Base silencieuse alertes artistes.
- 2026-11-16 — Préférence `event_reminders` respectée côté client.
