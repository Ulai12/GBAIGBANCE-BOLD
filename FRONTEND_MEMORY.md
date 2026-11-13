# FRONTEND_MEMORY.md

## Périmètre
Mémoire du travail frontend de GBAIGBANCE-BOLD. Ne jamais lire ni modifier `PROJECT_MEMORY.md`, réservé à un autre agent.

Les branches `Frontend-IA` et `FRONTED-iA` ont été fusionnées le 2026-11-13 dans `Frontend-IA` (PR #6 vers `main`). Cette branche contient désormais le dock mobile, le verre sombre à transparence réduite, l'explorateur de catégories et les correctifs stats/analytics.

## Gouvernance
- Lire ce fichier avant chaque session et le mettre à jour avec les changements réellement effectués.
- Le code et l'état Git font autorité si cette mémoire diverge.
- Priorité : UI, UX, responsive, accessibilité, animations, navigation et performance.
- Ne pas modifier `package.json`, les lockfiles ou les dépendances sans demande explicite.
- Ne jamais prétendre qu'un build, lint, typecheck, test ou contrôle visuel a réussi s'il n'a pas été exécuté.
- Ne pas fusionner dans `main` sans demande explicite.

## Projet
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`
- Branche fusionnée : `Frontend-IA` (base de la PR #6)
- Branche absorbée : `FRONTED-iA`
- Stack : React 18, TypeScript, Vite, Tailwind CSS, Motion, Lucide, React Router, Supabase.
- Identité : violet (#6600FF / #8B5CF6), thème clair/sombre, Liquid Glass.

## Journal

### 2026-11-12 — Frontend-IA : verre sombre et dock
- `prefers-reduced-transparency` : surcharge `.dark` dans `src/index.css` pour garder des surfaces sombres. Commit `8b7b1d6` sur `main`.
- Dock mobile (`src/components/BottomNav.tsx`) : labels 11px, dock 62px, aria-label du badge billets avec pluralisation fr/en. Commit `59bae5d` sur `Frontend-IA`.
- Validation navigateur (320, 375, 414, 768, 1024, 1440) et build/lint : non exécutés dans la session distante. PR #6 ouverte, non fusionnée dans `main`.

### 2026-11-12 — FRONTED-iA : cartes, catégories, stats
- `EventCard.tsx` : plus de bouton imbriqué dans un `article role="button"` ; overlay de découverte distinct ; suppression de `min-h-[full]`.
- `BottomNav.tsx` : bouton Créer 44×44 px, focus clavier, `prefers-reduced-motion`. Commit `d381a3b`.
- Explorateur de catégories : hiérarchie parent/sous-catégorie, catalogue publié complet, plus de flicker ni de polling.
- Stats/analytics : historique organisateur par mois, pas d'échantillon partiel, repli JavaScript typé, billets uniques.
- Build de preview frontend consigné comme réussi dans les commits de la branche ; pas rejoué lors de la fusion.

### 2026-11-13 — Fusion `FRONTED-iA` → `Frontend-IA`
- Ancêtre commun : `75a06f1`.
- Conflits résolus :
  - `src/components/BottomNav.tsx` : bouton Créer conservé à 44×44 px avec anneau de focus et `motion-reduce` (FRONTED-iA), en gardant les labels 11px, le dock 62px, le badge accessible et le `GlassPanel` déjà fusionnés automatiquement.
  - `FRONTEND_MEMORY.md` : les deux journaux sont réunis ici.
- `main` n'a pas été modifié.

## Ouvert
- Contrôle visuel du dock et du thème sombre « réduire la transparence » toujours à faire aux largeurs 320–1440.
- Build, lint et typecheck de la fusion non exécutés tant qu'ils ne sont pas lancés.


### 2026-11-13 — Explorateur : catégories privées et chips horizontales
- `src/screens/HomeScreen.tsx`: cartes de catégorie réduites (hauteur minimum 104px → 76px, icône 18px, libellé 11px) pour rendre la grille mobile plus équilibrée.
- Les sous-catégories sont désormais des chips compactes défilables horizontalement dans la barre de sélection des résultats, alignées sur la même rangée que le bouton « Fermer ».
- `src/constants/categories.ts`: la catégorie parent « Privé & Célébrations » est conservée et sa taxonomie enrichie en Mariages, Anniversaires, Cérémonies familiales, VIP privés et Célébrations.
- Inspection Supabase : la table `public.events` ne possède pas de colonnes dédiées `main_category` / `subcategory`; l'architecture actuelle expose l'enrichissement via les métadonnées de description. Aucune migration ni mutation de base n'a été faite.
- Commit UI `7ed5cbc`; commit taxonomie `67a5049`. Build, lint, typecheck et contrôle visuel navigateur non exécutés dans cette session.


### 2026-11-13 — Dashboard global, grille 6 catégories et verre sombre
- `src/screens/HomeScreen.tsx`: l'explorateur conserve les 6 catégories canoniques déjà présentes (Culture & Arts, Business & Pro, Nuit & Fêtes, Sports & Rencontres, Privé & Célébrations, Loisirs & Découvertes) et passe à une grille mobile 3 colonnes × 2 rangées ; tuiles min-height 84px.
- `src/features/events/queries.ts`: le total utilisateurs ne vient plus de `profiles.count` (incomplet pour les comptes sans profil). Il est récupéré via `supabase.functions.invoke('platform-stats')`, dont la fonction Edge utilise `auth.admin.listUsers` côté serveur pour compter les comptes Auth, y compris les comptes invités représentés dans Auth. Aucune donnée personnelle n'est renvoyée au client.
- Les statistiques signalent maintenant `isAvailable` ; en cas d'erreur de collecte, le dashboard affiche un tiret plutôt qu'un faux zéro.
- `src/components/GbaigbanceStatsDashboard.tsx`: renforce le matériau Liquid Glass sombre (gradient violet plus translucide, bord supérieur lumineux, reflet spéculaire, ombres internes) et le contraste des KPI.
- Diagnostic projet Supabase connecté : 8 événements, 6 artistes, 3 organisations, 0 profils, 0 billets et 0 compte `auth.users` dans ce projet. La capture montrant 4 utilisateurs indique probablement un projet Supabase différent utilisé par le déploiement ou un cache ; vérifier `VITE_SUPABASE_URL`/les variables Vercel avant de conclure sur les chiffres en production.
- Commits directs sur `FRONTEND-iA` uniquement : `621c52c` (grille), `0955438` (agrégat Auth), `10aa579` (verre sombre), `99c41e8`, `2750e0f`, `e335d9b` (état indisponible), `c369a5d` (reflet verre). Aucune PR créée.
- Relecture GitHub des fichiers modifiés effectuée. Build, lint, typecheck, exécution réelle de la fonction Edge et contrôle visuel navigateur non exécutés dans cette session.


### 2026-11-13 — Assainissement des statistiques globales
- `src/features/events/queries.ts`: `fetchPlatformStats()` ne fusionne plus `localStorage` avec les billets Supabase. La fonction délègue les KPI à un agrégateur serveur unique et renvoie `isAvailable: false` en cas d'échec, sans présenter les données locales comme des données de plateforme.
- `supabase/functions/platform-stats/index.ts`: agrégateur global paginé (events, tickets, profiles, organizations, artists, ticket_options, Auth). La clé `service_role` reste côté Edge Function ; seuls des nombres et séries agrégées sont renvoyés. L'endpoint est public car la section « GBAIGBANCE en chiffres » est affichée publiquement ; `verify_jwt=false` est intentionnel, aucun email/nom/id n'est renvoyé.
- Comptes : `totalUsers` compte les comptes Auth inscrits, en excluant les invitations de plateforme non acceptées (`invited_at` sans `confirmed_at`). Les profils sont comptés séparément ; `totalParticipantAccounts` ventile les comptes participants (rôle participant ou profil absent) ; `totalPendingPlatformInvitations` reste séparé.
- Participants : `totalParticipants` additionne `events.attendees_count` pour événements publiés/terminés. Ce sont des participations cumulées déclarées par événement, pas des personnes uniques ; l'interface le précise. Les participants externes sans compte peuvent donc y figurer s'ils ont été enregistrés par le flux événementiel.
- Billets : statuts comptés `active`, `valid`, `used`; annulations et remboursements sont séparés. Les unités vendues utilisent `ticket_options.quantity_sold` (repli sur lignes de billets si inventaire à zéro) ; revenus issus des montants `price_paid` des billets non annulés/non remboursés. Séries et répartitions sont globales.
- `src/components/GbaigbanceStatsDashboard.tsx`: six KPI équilibrés (billets, ventes, comptes inscrits, participations cumulées, profils, événements actifs), grille 2 colonnes mobile / 3 colonnes desktop ; compte Auth distinct du profil et des participations.
- Edge Function `platform-stats` déployée sur le projet connecté `lwwiolbofrqakvrdvbbj`, version 3, `verify_jwt=false`. Source du code versionnée sur `FRONTEND-iA`.
- Vérification SQL du projet connecté : 8 événements au total, 0 événement actif, 0 compte Auth inscrit, 0 invitation plateforme en attente, 0 profil, 0 ligne ticket, 0 unité `quantity_sold`, 21 529 participations cumulées dans `attendees_count`. Ces chiffres sont atypiques et ne correspondent pas à la capture (4 utilisateurs/1 événement) : vérifier que l'URL Supabase utilisée par le déploiement preview correspond au projet connecté. Ne pas corriger/écraser ces compteurs sans audit événement par événement.
- Migrations : l'historique du projet connecté ne contient pas la migration billetterie/refunds du 24 septembre ; les tables `payments` et `ticket_refunds` ne sont pas présentes dans le schéma réel. L'agrégateur reste compatible avec les tables existantes et n'invente pas de chiffre d'affaires via une table absente.
- Validation : déploiement Edge Function confirmé version 3 ; requête SQL de contrôle effectuée ; fichiers relus sur la branche. Invocation de la fonction depuis un client, build/lint/typecheck et contrôle visuel navigateur non disponibles dans cette session. Aucun changement destructif ni modification de données historiques. Aucun PR créé.


### 2026-11-13 — Blocage de synchronisation avec main
- Contrôle de divergence : `FRONTEND-iA` est en avance de 51 commits et en retard de 8 commits sur `main` (ancêtre commun `8586ee9`).
- PR temporaire #10 (`main` → `FRONTEND-iA`) créée uniquement pour tester une fusion simple ; GitHub a confirmé `mergeable_state=dirty` / `mergeable=false` (conflits). PR fermée sans fusion.
- Aucun conflit n'a été résolu automatiquement ou par supposition. Conformément à la règle de sécurité, arrêt des modifications de code jusqu'à résolution manuelle des conflits et nouvelle comparaison des branches.
- Cette session : aucune modification frontend ni backend. Build, lint, typecheck, tests et contrôle visuel non exécutés.
- Prochaine étape : examiner les conflits entre les 8 commits de `main` et la branche, les résoudre explicitement, puis reprendre le chantier UI actif.
