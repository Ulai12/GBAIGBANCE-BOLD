# FRONTEND_MEMORY.md — Mémoire frontend

## Règles permanentes
- Branche Git unique : `FRONTEND-iA`.
- Après chaque commit : relecture distante + tailles. Rétrécissement >20 % non voulu → ARRÊT + restauration.
- Fichiers >25 ko : risque de troncature via connecteur ; préférer git local / API complète.

- Ne jamais modifier « Explorer par catégorie » (catégories principales, sous-catégories, grille, cartes, proportions, styles, interactions et hiérarchie) sans demande explicite de l'utilisateur.

## Projet
- Dépôt : https://github.com/Ulai12/GBAIGBANCE-BOLD
- Branche : `FRONTEND-iA`
- Stack : React 18, TypeScript, Vite, Tailwind, Supabase `lwwiolbofrqakvrdvbbj`.

## Tâche active (23 novembre 2026) — RÉSOLUE P0
**Restauration `src/locales/fr/events.json` et `src/locales/en/events.json` COMPLÉTÉE**

### État
- Fichiers restaurés depuis commit sain `8ce468fdf13e794d781188a05d3924f8e8ab0ac2`.
- Tailles distantes confirmées : FR 42191 octets, EN 37953 octets.
- Commits de restauration : 0ba2c844 (FR), 387eb3e3 (EN).

### Prochaine étape
- Localisation progressive OrganizerDashboardScreen par petits commits.
- Merger les localisations récentes de main si nécessaire.

## Incidents
- 2026-11-23 : events.json tronqués/PLACEHOLDER. Résolu par restauration API directe.

## Backlog
P1 : i18n OrganizerDashboard (petits commits).
P2 : États loading/empty.


## 2026-11-23 — Localisation du tableau de bord organisateur (FR/EN)
- Localisé les libellés du `OrganizerDashboardScreen` : titres, onglets, états d'événement, formulaire, scanner, modales, messages toast et erreurs de chargement.
- Ajout des ressources `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`, enregistrées dans `src/locales/index.ts`.
- Ajout d'un `aria-label` traduit au bouton icône de création; le lieu par défaut suit désormais la langue active.
- Aucun changement backend/API, données métier, dépendance, parcours de catégories ou autre écran.

Fichiers : `src/screens/OrganizerDashboardScreen.tsx`, `src/locales/index.ts`, nouveaux JSON FR/EN, `FRONTEND_MEMORY.md`.

Vérifications : contrôle statique des références et clés de traduction effectué; JSON sérialisé/parsable. Premier build Vercel échoué sur un `>` manquant au bouton Retour (ligne 185), corrigé dans le commit `41508e2`. Build Vite + génération PWA/preview ensuite réussi; déploiement Preview `READY` pour `41508e2`. Typecheck, lint et rendu visuel navigateur non exécutés. Les composants enfants (`OrganizerMetricsChart`, `OrganizerRefundsTab`, `TicketScannerModal`, `EventManagementModal`) peuvent encore avoir des libellés à localiser.

Prochaine priorité : localiser progressivement ces composants enfants et harmoniser les états loading/empty, sans modifier Explorer par catégorie.


## 2026-11-23 — Favoris événements : repli RPC (P1)
- Constat : la capture iOS montre l'échec de retrait avec rollback optimiste. Le parcours appelle `toggle_event_like` via RPC; la migration `supabase/migrations/20261117170000_fix_likes_follows_storage_v1.sql` présente dans la branche ne contient que des commentaires, tandis que `event_likes` et ses policies RLS existent dans `complete_schema.sql`. L'absence de la RPC dans l'environnement distant est plausible mais n'a pas été testée directement.
- Correction frontend sur `src/features/events/interactions.ts` : si Supabase répond explicitement que la RPC est introuvable (PGRST202/42883 ou message équivalent), bascule sur la table `event_likes` avec session authentifiée et policies RLS; ajoute/supprime le like et gère la contrainte unique en cas de double action concurrente. Les autres erreurs backend continuent de remonter et déclenchent le rollback existant.
- Commit : `ae954790d2ed978eeb439c920b79760969d90330` sur `FRONTEND-iA`.
- Vérification : relecture distante du fichier après commit, contenu modifié confirmé. Preview Vercel lancée pour ce commit; état BUILDING au dernier contrôle. Aucun test de clic réel ni test mobile/visuel effectué à ce stade.
- À vérifier : build Vercel READY, ajout/retrait sur compte authentifié, persistance après rechargement, synchronisation entre onglets/appareils, compteur `likes_count` (aucun trigger de compteur n'a été confirmé par l'inspection actuelle).
