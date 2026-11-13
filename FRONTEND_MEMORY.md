# FRONTEND_MEMORY.md

## Périmètre
Mémoire du travail frontend de GBAIGBANCE-BOLD. Ce fichier est la continuité du chantier frontend. `PROJECT_MEMORY.md` est consulté uniquement en lecture seule pour le contexte backend.

## Gouvernance
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Branche d'écriture exclusive : `FRONTEND-iA`. Ne jamais écrire sur `main`, ne jamais fusionner vers `main`, ne jamais faire de force push.
- Le 2026-11-13, la branche exacte `FRONTEND-iA` a été créée depuis `main` car elle n'existait pas.
- PR #9 et PR #11 ont été fusionnées dans `main` par le propriétaire. Cet agent ne fusionne pas vers `main`.
- Lire ce fichier en entier au début de chaque session et reprendre la tâche active.
- Le code distant et l'état Git font autorité si cette mémoire diverge.
- Ne pas modifier `package.json`, les lockfiles ou les dépendances sans autorisation explicite.
- Après chaque écriture : relire depuis GitHub sur `FRONTEND-iA`, vérifier le commit, la taille, le contenu et l'absence de troncature.
- Ne jamais prétendre qu'un build, lint, typecheck, test ou contrôle visuel a réussi s'il n'a pas été exécuté.
- Une amélioration principale significative par session ; préserver les changements préexistants.

## Projet
- Stack : React 18, TypeScript, Vite, Tailwind CSS, Motion, Lucide, React Router, Supabase.
- Identité : violet `#6600FF` / `#8B5CF6`, thèmes clair et sombre, surfaces Liquid Glass.
- Public : mobile-first, Android d'entrée de gamme, iPhone, réseaux mobiles parfois lents.

## Tâche active — Marges des rails et filtrage catégories accueil
**Objectif :** les capsules de catégories et les cartes de proximité ne collent plus aux bords de l'écran ; « Explorer par catégorie » affiche les événements existants.

**Progression :**
- Terminé le 2026-11-13 : suppression de `-mx-5` sur les rails de catégories (Accueil et Recherche) et sur le carrousel « À proximité ». Les éléments restent dans le padding `px-5` de leur section, comme les onglets de « Modifier l'événement ».
- Terminé : hydratation des événements dans `allActiveEvents` avant le filtrage par catégorie. Les événements sans `main_category` explicite sont maintenant classés selon leur catégorie héritée ou leurs tags.
- Vérifié : ESLint des deux fichiers (1 erreur préexistante `t` inutilisé dans HomeScreen, hors de ce changement).

**Fichiers concernés :**
- `src/screens/HomeScreen.tsx` — rail sous-catégories, carrousel proximité, hydratation.
- `src/screens/ExploreScreen.tsx` — rails de catégories.

**Dernière action :** marges restaurées et filtrage catégories corrigé.

**Prochaine étape :** écran Auth (`src/screens/AuthScreen.tsx`) — thème clair forcé, rôles serrés à 320px.

## Design system — décisions à préserver
- Couleurs principales : violet `#6600FF`, violet secondaire `#8B5CF6`, surfaces sombres existantes `#14121E` / `#17131D`. Ne plus introduire `#5900E6` sur Recherche.
- Typographie : hiérarchie Tailwind existante ; titres de section compacts, libellés de catégories 11–12px sur mobile.
- Espacements : grille catégorie accueil gap 8px mobile ; sous-catégories gap 8px ; padding horizontal de page 20px (`px-5`).
- Rayons : tuiles d'accueil `rounded-2xl` ; capsules de filtre et sous-catégories `rounded-full`.
- Cibles tactiles : actions importantes ≥ 44px (`min-h-11`). Les capsules de sous-catégorie de l'accueil restent à 36px (`min-h-9`) — dette assumée, à ne relever qu'avec un contrôle visuel.
- Focus : anneau violet visible avec offset adapté au thème sombre.
- Mouvement : transitions courtes ; `motion-reduce:transition-none` sur les contrôles de Recherche.
- Responsive Recherche : rail horizontal snap ; segment « Amis » court sous 400px.
- Performance : pas de nouvelle dépendance.

## Cartographie des écrans
| Écran / zone | Statut | Notes |
|---|---|---|
| Accueil — explorateur de catégories | Finalisé | Grille 2/3/5, tuiles 80px. Rail sous-catégories contenu dans le padding. Hydratation ajoutée pour le filtrage |
| Accueil — proximité | Finalisé | Carrousel contenu dans le padding `px-5`, plus de débordement aux bords |
| Recherche — catégories et filtres | Finalisé | Rails contenus dans le padding, plus de `-mx-5` |
| Recherche — grille de résultats | À revoir | Catalogue vide pendant le contrôle (0 résultat) ; cartes réelles non revues |
| Accueil — dock mobile | À revoir | Labels 11px, dock 62px, bouton Créer 44px |
| Thème sombre / réduction de transparence | À revoir | Correctif CSS présent |
| Création / modification d'événement | À auditer | Typecheck préexistant en échec sur l'assistant |
| Connexion / inscription | À revoir | Thème clair forcé, prochaine tâche |
| Billets / portefeuille | À auditer | Aucun changement |
| Profil / favoris / notifications | À auditer | Aucun changement |
| Dashboard organisateur / statistiques | À revoir | Correctifs déjà dans l'historique |

## Dette UI
- **P1** — `npm run typecheck` échoue déjà hors de cette session : `src/App.tsx`, `src/features/events/queries.ts` (`selectPages` introuvable), `src/screens/CreateEventWizardScreen.tsx` (union `SubCategoryId`). Ne pas les mélanger à une retouche visuelle sans les isoler.
- **P2** — AuthScreen non adapté au thème sombre ni au clavier virtuel.
- **P2** — Capsules de sous-catégorie de l'accueil à 36px, sous la cible 44px.
- **P2** — Contrôler le dock mobile et les safe areas iOS sur appareil réel.
- **P3** — Harmoniser les états vides, chargement, erreur et hors-ligne.

## Incidents d'écriture
- Aucun incident de troncature le 2026-11-13.
- `main` était en avance d'un seul commit de fusion (PR #11, `b9a4b3f`) sans différence de fichiers. Avance rapide de `FRONTEND-iA`, aucun conflit.

## Vérifications
- **Vérifié :** `FRONTEND-iA` existait. Comparaison avant travail : `FRONTEND-iA` `8011838`, `main` `b9a4b3f`, `behind_by: 1`, diff d'arbre vide. Fast-forward local puis poussé avec le commit de fonction.
- **Vérifié :** ESLint `src/screens/ExploreScreen.tsx` — exit 0.
- **Vérifié :** `vite build` — succès (3288 modules). `tsx scripts/generate-preview.ts` — succès, 14 aperçus statiques. Aucun fichier de preview versionné modifié.
- **Vérifié navigateur :** Recherche à 320, 375, 414, 768, 1024 et 1440 px. Thème sombre (classe `dark`) sur ces largeurs ; thème clair à 320 et sur la feuille de filtres 320. Pas de scroll horizontal de page (`scrollWidth === clientWidth`). Capsules de sous-catégorie mesurées à 44px. Rail 498px dans un viewport 320. Console : pas d'erreur non interceptée (connexions Vite uniquement).
- **Vérifié navigateur :** Accueil catégories à 320 sombre. Tuiles mesurées à 80px, rail 467px, capsules 36px, page 320 sans débordement.
- **Non vérifié :** `npm run typecheck` échoue sur des erreurs préexistantes, aucune dans `ExploreScreen.tsx`. Pas de script de tests dans `package.json`. Pas de contrôle iPhone réel ni `prefers-reduced-motion` sur appareil. Grille de résultats avec de vrais événements non affichée (catalogue vide dans cet environnement).

## Backlog
1. P1 — Corriger le typecheck préexistant (`selectPages`, `SubCategoryId`, `authState`) dans un chantier isolé.
2. P2 — Auth : thème sombre, cibles 44px, rôles lisibles à 320px, focus et clavier.
3. P2 — Relever les capsules accueil de 36px à 44px seulement après contrôle visuel.
4. P2 — Dock mobile, safe areas iOS, réduction de transparence.
5. P3 — États vides, chargement, erreur et hors-ligne du portefeuille et de la recherche quand le catalogue répond.

## Historique
### 2026-11-13 — Marges des rails et filtrage catégories
- Suppression de `-mx-5` sur les rails de catégories (Accueil, Recherche) et le carrousel « À proximité ». Les éléments restent dans le padding de leur section.
- Hydratation des événements dans `allActiveEvents` avant le filtrage. « Explorer par catégorie » affiche maintenant les événements classés selon leur catégorie héritée.
- Signalé par captures iPhone : capsules et cartes collées aux bords, catégorie « Privé & Célébrations » vide malgré des événements existants.

### 2026-11-13 — Recherche : hiérarchie de catégories
- Capsules parentes et rangée de sous-catégories directement sur Recherche, violet `#6600FF`, 44px, snap, focus, `prefers-reduced-motion`.
- La catégorie parente reste visible quand une sous-catégorie est active. La feuille de filtres suit le même modèle.
- Segment participants raccourci en « Amis » sous 400px.
- Contrôle navigateur 320–1440 et build Vite réussis. Typecheck global toujours rouge pour des causes antérieures.
- Synchronisation : fast-forward de `FRONTEND-iA` sur le merge `main` `b9a4b3f` (PR #11), arbres identiques.

### 2026-11-13 — Accueil : proportions des catégories
- Hauteur minimale des cartes principales 80px, icônes 18px, sous-catégories en rangée horizontale.
- Commit d'origine : `5bfe0a46ba7a292a3f5105871be27fb0c2dddf7a`.
- Contrôle visuel 320 sombre ajouté lors de la session Recherche.

### 2026-11-12 — FRONTEND-iA : verre sombre et dock
- `prefers-reduced-transparency` : surcharge `.dark` dans `src/index.css`.
- Dock mobile : labels 11px, dock 62px, aria-label du badge billets.

### 2026-11-12 — Cartes, catégories, stats
- `EventCard.tsx` : plus de bouton imbriqué dans un `article`.
- Explorateur de catégories : hiérarchie parent/sous-catégorie, catalogue publié complet.
- Stats/analytics : historique organisateur par mois.

### 2026-11-13 — Synchronisation
- Merge `main` dans `FRONTEND-iA` (`989a5bd`) après résolution documentée de `HomeScreen.tsx` et `EditEventScreen.tsx`.
- PR #10 fermée sans fusion. PR #11 ouverte en brouillon puis fusionnée dans `main` par le propriétaire (`b9a4b3f`).

### 2026-11-13 — Diagnostic et amélioration statistiques
- `GbaigbanceStatsDashboard.tsx`: ajout du mode « Tout » pour explorer l'historique mensuel complet (avec agrégation frontend depuis tickets/eventsTimeline) et du KPI « Vues cumulées » alimenté par `totalViews`.
- `HomeScreen.tsx`: récupération de `platformStats` séparée du Promise.all de chargement des contenus, afin qu'un échec sur une autre requête d'accueil ne bloque plus l'actualisation de la section statistiques.
- `OrganizerDashboardScreen.tsx`: plage initiale passée à « Tout » pour éviter le graphique vide par défaut sur les ventes plus anciennes que 7 jours.
- Diagnostic Supabase read-only : 8 événements (tous publiés, 0 actifs à l'heure de l'inspection), 3 organisations, 6 artistes, 0 lignes tickets, 0 ticket_options, 0 profiles, somme attendees_count 21 529, somme views_count 145 000. Edge function `platform-stats` active, réponses HTTP 200 observées dans les logs.
- Vérifications build/typecheck et rendu navigateur : non exécutées dans cette session. Commit direct sur `FRONTEND-iA` : `cf55a509`, `be4d5075`, `1ec778e6`.


### 2026-11-13 — Exclusion des données de seed des statistiques publiques
- Correction du diagnostic précédent : les 21 529 participations et 145 000 vues calculées sur Supabase étaient des valeurs fictives provenant de la seed, et ne doivent pas être présentées comme engagement réel.
- Source démontrée : `supabase/migrations/20260725074839_gbaigbance_seed_data.sql` insère 8 événements avec IDs `e1000000-…`, nombres de vues/participants/likes gonflés ; la migration `20260909120000_gbaigbance_cleanup_seed_and_gemini_config.sql` prévoyait explicitement leur suppression, mais la base active les contient encore (8/8 events, 6 artistes et 3 organisations de seed ; 0 événement non-seed).
- `supabase/functions/platform-stats/index.ts`: filtrage des événements, billets/options reliés aux événements seed, artistes et organisations de démonstration avant calcul des totaux et timelines. Aucun enregistrement de base supprimé.
- Edge Function `platform-stats` déployée sur Supabase version 4, commit GitHub `f515bb0ef1c3a1082a15cce74b3056361755920e` (branche `FRONTEND-iA`). Pas de vérification runtime d'invocation effectuée après déploiement dans cette session.
- Les stats publiques deviennent propres à la seed exclusion, mais les données d'activité de vrais événements doivent toujours provenir de compteurs réellement générés par les actions app; les totaux attendees_count ne sont pas considérés comme fiables par défaut pour ces événements seed.


### 2026-11-13 — Vérification déploiement / statistiques toujours indisponibles
- La fonction Supabase `platform-stats` est bien ACTIVE en version 4 depuis 2026-11-13 08:07 UTC ; le contenu récupéré sur Supabase correspond au code filtrant les seeds (SHA de contenu `5174ccc9…`).
- Le dernier déploiement Vercel de `FRONTEND-iA` est READY : `dpl_A3Ms8RtscPRo68GFnhwDW69GarA3`, commit `d17c9113a12f3c0714d2d5c48cc4859c706adc7d`, URL preview `https://gbaigbance-event-3wmvoy5ky-shogun10.vercel.app`.
- L'alias de production `gbaigbance-event.vercel.app` pointe encore sur le déploiement de `main`, commit `b9a4b3f53788f6d1305698aa1e326a9af2fcf886`; les commits de correction sur `FRONTEND-iA` ne sont donc pas encore intégrés à la production. Ne pas ouvrir de PR ni modifier main sans demande explicite.
- Les dernières requêtes `platform-stats` trouvées dans les logs avant le déploiement v4 sont des appels de version 3 (UA HeadlessChrome) entre 07:29 et 07:36 UTC ; aucun appel n'apparaît entre 08:07 et 08:20 UTC. Il n'y a donc pas encore de preuve que l'iPhone ait appelé la version 4.
- Le frontend appelle `supabase.functions.invoke('platform-stats')`; si invocation échoue ou si `data.totalUsers`/`data.totalTickets` n'est pas numérique, il retourne `isAvailable:false`, ce qui explique les tirets. Le composant les affiche volontairement quand isAvailable=false.
- La PWA utilise `registerType: 'prompt'` : une mise à jour peut rester en attente jusqu'à validation de l'action « Actualiser ». Test prioritaire : ouvrir le preview `FRONTEND-iA` dans Safari (pas l'icône installée) pour vérifier la nouvelle build et générer une requête après version 4. Ensuite inspecter les logs Supabase et les erreurs console avant toute autre modification.
