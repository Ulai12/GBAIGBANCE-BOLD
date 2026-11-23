# FRONTEND_MEMORY.md — Mémoire frontend

## Règles permanentes
- Branche Git unique : `FRONTEND-iA`. Vérifier la branche avant toute écriture et avant chaque commit.
- Ne jamais créer ou ouvrir de pull request sans demande explicite.
- Ne jamais modifier `main` ni une autre branche.
- Ne jamais lire, modifier ou utiliser `PROJECT_MEMORY.md`.
- Ne pas toucher à la section « Explorer par catégorie » (intouchable sauf demande explicite).
- Préserver les fonctionnalités, données, hiérarchies métier et contrats backend existants.
- Un seul chantier principal par session ; pas de commits de remplissage.
- Distinguer systématiquement réalisé, testé, non vérifié et recommandé.
- Après chaque commit : relecture distante + comparaison de tailles. Si rétrécissement >20 % non voulu → ARRÊT et restauration.

## Projet
- Dépôt : https://github.com/Ulai12/GBAIGBANCE-BOLD
- Branche autorisée : `FRONTEND-iA`
- Stack : React 18, TypeScript, Vite, Tailwind, Supabase.
- Projet Supabase client : `lwwiolbofrqakvrdvbbj`.

## Tâche active (23 novembre 2026)
**P0 terminé** — Restauration de `OrganizerDashboardScreen.tsx` après troncature.

### Objectif atteint
Remettre un fichier complet et fonctionnel (liste, métriques, scanner, modals création/suppression).

### Progression
- Fichier tronqué (~21 ko, modals absents) restauré depuis le commit sain `8ce468fd`.
- Commit de restauration : `e4e30a08` sur FRONTEND-iA.
- Taille distante post-restore : ~29,4 ko (logique complète, accolades équilibrées, TicketScannerModal + modals présents).
- Différence de taille vs original (~33 ko) due au reformatage whitespace, pas à une perte de logique.

### Fichiers concernés
- `src/screens/OrganizerDashboardScreen.tsx` — restauré
- `FRONTEND_MEMORY.md` — restauré et mis à jour

### Dernière action
2026-11-23 — Restauration P0 OrganizerDashboardScreen + mémoire. Vérification distante OK (contenu complet).

### Prochaine étape (session suivante)
- Localisation FR/EN progressive de OrganizerDashboardScreen (clés `organizerDashboard` dans events.json) par **petits commits** pour éviter les troncatures.
- Ou polish responsive / états loading-empty sur un autre écran prioritaire (Favorites, Notifications déjà avancés).
- Propriétaire : merger main → FRONTEND-iA si divergences de localisation.

### Vérifications
- Branche FRONTEND-iA confirmée.
- Relecture distante OrganizerDashboardScreen : contenu complet, vrai code, fin de fichier correcte.
- Rendu navigateur / build / lint : non exécutés cette session.

## Incidents d'écriture
- 2026-11-23 : troncature OrganizerDashboardScreen (placeholders puis contenu partiel). Restauré via `e4e30a08` depuis `8ce468fd`.
- 2026-11-23 : FRONTEND_MEMORY écrasé en version courte. Restauré dans ce commit.
- Consigne : préférer push_files / API pour fichiers >25 ko ; jamais de contenu partiel.

## Backlog priorité
P0 : — (restauration faite)
P1 : Localisation OrganizerDashboard (petits commits) ou vérif build.
P2 : États loading/empty/error cohérents sur écrans principaux.
P3 : Accessibilité (contrastes, cibles ≥44px).

## Cartographie écrans (résumé)
- Finalisé / localisé : Home, Tickets, Profile, Explore, Notifications, EventDetail (polish responsive).
- À traiter : OrganizerDashboard (logique OK, i18n partielle), Favorites (déjà riche), CreateEventWizard, Auth/Onboarding.
- Intouchable : section Explorer par catégorie.

## Historique concis récent
- 2026-11-23 : Polish EventDetailScreen (grille date/heure, CTA sticky safe-area).
- 2026-11-23 : Incident troncature OrganizerDashboard → restauration P0.
- 2026-11-22/23 : Localisation ExploreScreen complète.
- Précédent : localisations Home / Profile / Tickets ; fondation paiements ; RLS optimisée.
