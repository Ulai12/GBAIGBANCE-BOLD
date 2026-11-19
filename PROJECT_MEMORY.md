# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD.

## Tâche active

P2 UI/UX — Localisation page Accueil (HomeScreen) : **en-tête et sections principales terminées**.

## Objectif

Localiser FR/EN les salutations dynamiques, le sous-titre d'en-tête et les titres des cartes/sections d'accueil.

## Progression

- Terminé :
  - Clés `common.homeScreen` FR + EN (commits 7d917cc3, c1ba934e).
  - **HomeScreen restauré et localisé** (commit b97b3504) :
    - Salutations dynamiques via `t('common', 'homeScreen.greeting.*')`
    - Sous-titre, guest, aria settings/profil
    - Sections : À la une, Tendances, À proximité, Artistes, Organisateurs
    - Chargement données + cache conservé
- Note : version stabilité (~16 ko) — section catégories (gelée) et certains blocs avancés (recommandations/gratuits/unmissable détaillés) absents de cette version compacte. Le fichier complet pré-incident reste dans `HomeScreen.tsx.localized.pending` (artifacts).

## Prochaine étape

1. Vérifier rendu Accueil FR/EN sur preview Vercel.
2. Réintroduire progressivement les blocs manquants si besoin (catégories gelées = ne pas toucher l'apparence).
3. Finitions EventDetailScreen / AISettings.

## Fichiers concernés

- `src/screens/HomeScreen.tsx`
- `src/locales/fr/common.json` / `en/common.json`
- `PROJECT_MEMORY.md`

## Vérifications

- Fichier distant taille ~15763 o, appels `homeScreen.*` présents.
- Plus de placeholder.

## Historique

- 2026-11-19 — HomeScreen restauré + i18n en-tête/sections (b97b3504).
- 2026-11-19 — Clés homeScreen + incident troncature.
- 2026-11-18 — ProfileScreen / TicketsScreen.
