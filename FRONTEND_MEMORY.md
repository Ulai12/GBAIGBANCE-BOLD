# FRONTEND_MEMORY.md

## Périmètre
Mémoire du travail frontend de GBAIGBANCE-BOLD. Ce fichier est la continuité du chantier frontend. `PROJECT_MEMORY.md` appartient à Grok : cet agent ne doit jamais le lire, l'utiliser ni le modifier.

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

## Tâche active — Catégories en capsules (création + édition)

### Création — livrée le 2026-11-15
`src/screens/CreateEventWizardScreen.tsx` : les catégories parent et sous-catégorie de l'étape Infos utilisent les capsules 44px (`min-h-11`), rail horizontal snap, focus violet, `motion-reduce`, libellés courts et description de la sous-catégorie. La valeur enregistrée reste l'id du catalogue (`main_category`, `subcategory`, catégorie historique dérivée).

**Commit :** `1b394978236907d237acd270269a5e22049a27c3` sur `FRONTEND-iA`.
**Vérifié :** relecture distante du fichier (83140 octets, blob `11980958a4b3ba774427c4f69a9347cd726704df)); `tsc --noEmit -p tsconfig.app.json`, ESLint du fichier et `vite build` exit 0 lors de cette intervention.
**Non vérifié :** rendu navigateur, clavier réel et iPhone.

### Édition — livrée en code le 2026-11-15
`src/screens/EditEventScreen.tsx` : remplacement de la grille parent à 76px et du select natif sous-catégorie par deux rails de capsules 44px. Parent/sous-catégorie sont des groupes radio avec `aria-checked`, tab-stop roving, focus violet et navigation clavier gauche/droite + Home/End. L'icône passe à 14px; la description de la sous-catégorie sélectionnée est visible sous le rail. Quand le parent change, le sous-rail revient au début. La logique métier reste inchangée : `main_category`, `subcategory` et `category` legacy continuent d'être mis à jour selon le catalogue.

**Commit initial du chantier :** `e9111e6b53330e399c97e522b29a96b820b95b02`.
**Commit de suivi :** `fix(frontend): reset subcategory rail on parent change` (inclut cette mise à jour de mémoire).
**Blob de code du commit de suivi :** `663698d4ac9f9967bd47115bf7c0817023ce0ae5`; taille `76519` octets. La relecture distante post-écriture doit confirmer la taille et le contenu.
**Vercel :** preview du commit initial `e9111e6` READY, déploiement `dpl_Cvcx2XoAVHCdnzy4UTE4tsu6TqdR`, URL `https://gbaigbance-event-rl17kvdwx-shogun10.vercel.app`. Le build du commit de suivi sera contrôlé après son push.
**Tests de cette exécution :** build/typecheck/lint locaux non exécutés. Le statut Vercel READY ne concerne que le commit initial. Rendu navigateur et iPhone non vérifiés (contexte navigateur indisponible).
**main :** inchangé; aucune PR.

**Prochaine priorité :** contrôler visuellement la taxonomie création/édition sur 320–414px et iPhone (proportions, rails, focus/clavier), puis dock mobile et safe areas. Ne pas augmenter les capsules d'accueil 36px sans mesure visuelle.
 
## Dernier chantier Auth — terminé ; fusion `main` toujours bloquée
**Objectif atteint le 2026-11-14 :** connexion et inscription suivent le thème clair/sombre, les rôles restent lisibles à 320px, les cibles font au moins 44px.

**Progression :**
- Terminé : `src/screens/AuthScreen.tsx` refondu (verre, champs, rôles, liens). Logique `signIn` / `signUp` inchangée.
- Bloqué, non poussé : fusion de `main` (`ffe871c`) dans `FRONTEND-iA`. Un seul conflit, `server.ts`. Fusion locale annulée (`git merge --abort`). Aucun fichier de `main` n'a été écrit sur la branche.

**Fichiers concernés :**
- `src/screens/AuthScreen.tsx` — écran login/signup.
- `server.ts` — conflit non résolu, fichier distant inchangé par cette session.

**Dernière action :** commit auth `d369889ae3789088e944e40de4a35bfc97365491` relu sur `FRONTEND-iA`.

**Prochaine étape :** ne pas recommencer Auth. Re-tenter la fusion de `main`. Si `server.ts` conflit encore, s'arrêter : `FRONTEND-iA` a retiré la route Express `/api/platform-stats` (`56330f0`) ; `main` (`fd7d25b`) la réintroduit dans le même fichier que le durcissement serveur. Ne pas choisir un côté sans décision du propriétaire. Ensuite : dock mobile et safe areas.

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
| Accueil — explorateur de catégories | Proportions ajustées | Flex-wrap centré, bases 2/3/4/6, tuiles 68/72/76px avec max-width progressive; rail sous-catégories compacté (36px conservés, contrôle appareil à faire) |
| Accueil — proximité | Finalisé | Carrousel contenu dans le padding `px-5`, plus de débordement aux bords |
| Recherche — catégories et filtres | Finalisé | Rails contenus dans le padding, plus de `-mx-5` |
| Recherche — grille de résultats | À revoir | Catalogue vide pendant le contrôle (0 résultat) ; cartes réelles non revues |
| Accueil — dock mobile | À revoir | Labels 11px, dock 62px, bouton Créer 44px |
| Thème sombre / réduction de transparence | À revoir | Correctif CSS présent |
| Création / édition — catégories | Code livré | Capsules parent/sous-catégorie 44px dans `CreateEventWizardScreen` et `EditEventScreen`; édition avec navigation clavier et description sélectionnée. Preview Vercel du commit initial READY; contrôle navigateur et iPhone non effectués. |
| Connexion / inscription | Finalisé | Thème clair/sombre, rôles empilés sous 480px, cibles 44px. Vérifié navigateur 320–1440 |
| Billets / portefeuille | À auditer | Aucun changement |
| Profil / favoris / notifications | À auditer | Aucun changement |
| Dashboard organisateur / statistiques | À revoir | Correctifs déjà dans l'historique |

## Dette UI
- **P1** — Typecheck global vert le 2026-11-15 (`b1d8072` : unions catégories + `authState?.returnTo`). Capsules parent/sous-catégorie 44px livrées dans création (`1b39497`) et édition (`e9111e6` + commit de suivi). Validation visuelle sur appareil encore requise.
- **P2** — Auth : thème et 320px traités le 2026-11-14. Clavier virtuel réel non contrôlé (le formulaire défile, `min-h-dvh`).
- **P2** — Capsules de sous-catégorie de l'accueil à 36px, sous la cible tactile 44px; contrôle visuel réel requis avant ajustement.
- **P2** — Contrôler le dock mobile et les safe areas iOS sur appareil réel.
- **P3** — Harmoniser les états vides, chargement, erreur et hors-ligne.

## Incidents d'écriture
- 2026-11-15 : push via connecteur GitHub a écrit des placeholders ("PLACEHOLDER_APP") au lieu du contenu complet sur App.tsx et types/index.ts (tailles ~300 octets). Restauré depuis commit précédent sain (11e067f), fixes réappliqués, commit b1d8072 poussé via git local. Tailles finales saines, contenu vérifié distant. Cause : limitation de transmission du contenu long dans l'appel outil.
- 2026-11-14 : fusion `main` → `FRONTEND-iA` annulée. Conflit unique `server.ts` (marqueurs 802–1031 sur la copie de travail, ~230 lignes). Côté `FRONTEND-iA` : zone vide (route Express stats retirée). Côté `main` : `handlePlatformStats` + `GET/POST /api/platform-stats`. Aucune troncature. Rien poussé. Tailles distantes de `server.ts` non modifiées par cette session (`FRONTEND-iA` 30154 octets / 792 lignes ; `main` 45068 octets / 1193 lignes).
- Aucun incident de troncature le 2026-11-13.
- `main` était en avance d'un seul commit de fusion (PR #11, `b9a4b3f`) sans différence de fichiers. Avance rapide de `FRONTEND-iA`, aucun conflit.

## Vérifications
- **Vérifié le 2026-11-15 :** commit `1b394978236907d237acd270269a5e22049a27c3` en tête de `FRONTEND-iA`. Relecture distante de `CreateEventWizardScreen.tsx` : 81675 → 83140 octets, blob `11980958a4b3ba774427c4f69a9347cd726704df`, contenu identique au fichier poussé (`wizard-main-category`, deux radiogroups, fin de composant réelle). `tsc` exit 0, ESLint du fichier exit 0, `vite build` exit 0. Rendu 320–1440 non exécuté.
- **Vérifié le 2026-11-15 :** `main` toujours `ffe871c14cb1a9959a5b1f23889db3491e341b66`. Fusion non relancée.
- **Vérifié le 2026-11-14 :** commit `07352871eefc8311497f5ca4c81f7b8bdd7d267f` sur `FRONTEND-iA`. Relecture distante de `queries.ts` : SHA `76ed8365…`, 13274 octets, helper `selectPages` présent et appelé correctement.
- **Vérifié le 2026-11-14 :** `FRONTEND-iA` `e1cb0c5` au départ, `main` `ffe871c`, `behind_by: 2` (`ffe871c`, `fd7d25b`). Fusion testée puis annulée. Commit auth poussé : `d369889ae3789088e944e40de4a35bfc97365491`. Relecture distante `AuthScreen.tsx` : blob `b9352ba84e68c0fdd492e59636b50c37fef9914e`, 7129 → 12889 octets, contenu réel (thème sombre, radiogroup, `min-h-11`).
- **Vérifié :** ESLint `src/screens/AuthScreen.tsx` — exit 0. `vite build` — succès (3288 modules). `npm run typecheck` — échec préexistant uniquement (`App.tsx` authState, `queries.ts` selectPages, `CreateEventWizardScreen.tsx` SubCategoryId). Aucune erreur dans `AuthScreen.tsx`. Pas de script de tests.
- **Vérifié navigateur :** Chromium headless, `prefers-reduced-motion`, `/login` et `/signup`, thèmes `gba_theme` clair et sombre, largeurs 320, 375, 414, 768, 1024, 1440. `scrollWidth === clientWidth` partout. Rôles signup mesurés à 44px (246px de large à 320, empilés ; 117px dès 768, une ligne, pas de débordement). Tous les boutons ≥ 44px. Aucune `pageerror`.
- **Non vérifié :** iPhone réel, clavier virtuel Android, contraste mesuré par outil. Rendu contrôlé sur build Vite preview, pas sur l'alias de production.
- **Vérifié (session précédente) :** `FRONTEND-iA` existait. Comparaison d'alors : `FRONTEND-iA` `8011838`, `main` `b9a4b3f`, `behind_by: 1`, diff d'arbre vide.
- **Vérifié :** ESLint `src/screens/ExploreScreen.tsx` — exit 0.
- **Vérifié :** `vite build` — succès (3288 modules). `tsx scripts/generate-preview.ts` — succès, 14 aperçus statiques. Aucun fichier de preview versionné modifié.
- **Vérifié navigateur :** Recherche à 320, 375, 414, 768, 1024 et 1440 px. Thème sombre (classe `dark`) sur ces largeurs ; thème clair à 320 et sur la feuille de filtres 320. Pas de scroll horizontal de page (`scrollWidth === clientWidth`). Capsules de sous-catégorie mesurées à 44px. Rail 498px dans un viewport 320. Console : pas d'erreur non interceptée (connexions Vite uniquement).
- **Vérifié navigateur :** Accueil catégories à 320 sombre. Tuiles mesurées à 80px, rail 467px, capsules 36px, page 320 sans débordement.
- **Non vérifié :** `npm run typecheck` échoue sur des erreurs préexistantes, aucune dans `ExploreScreen.tsx`. Pas de script de tests dans `package.json`. Pas de contrôle iPhone réel ni `prefers-reduced-motion` sur appareil. Grille de résultats avec de vrais événements non affichée (catalogue vide dans cet environnement).

## Backlog
1. P0 — Décision propriétaire sur le conflit `server.ts` avant toute fusion de `main` (`ffe871c`, `fd7d25b`). Ne pas réintroduire ni supprimer la route Express sans cet arbitrage.
2. P2 — Contrôler visuellement les capsules de création/édition (320–414px, focus, navigation clavier, rail après changement de parent) sur preview/appareil.
3. P2 — Vérifier les capsules accueil à 36px sur preview/appareil; décider ensuite du passage à 44px.
4. P2 — Dock mobile, safe areas iOS, réduction de transparence.
5. P3 — États vides, chargement, erreur et hors-ligne du portefeuille et de la recherche quand le catalogue répond.

## Historique

### 2026-11-15 — Édition : taxonomie en capsules
- `src/screens/EditEventScreen.tsx` : parent et sous-catégorie deviennent des capsules radio horizontales 44px, avec snap, focus violet, navigation clavier (gauche/droite, Home/End), tab-stop roving et description du choix. Le rail de sous-catégorie est réinitialisé au début au changement de parent.
- Commit initial `e9111e6b53330e399c97e522b29a96b820b95b02`; commit de suivi `fix(frontend): reset subcategory rail on parent change`, qui combine ce correctif interactif et la mise à jour mémoire.
- Blob du code de suivi `663698d4ac9f9967bd47115bf7c0817023ce0ae5`, `76519` octets; relecture distante post-commit requise.
- Preview Vercel du commit initial READY (`dpl_Cvcx2XoAVHCdnzy4UTE4tsu6TqdR`). Pas de build/typecheck/lint local ni de contrôle visuel navigateur dans cette exécution. Aucune PR, aucune modification de `main`.

### 2026-11-15 — Création : capsules de catégories
- `src/screens/CreateEventWizardScreen.tsx` : l'étape Infos affiche la taxonomie parent / sous-catégorie en capsules radio 44px, comme Recherche, au lieu de deux `<select>`.
- Commit `1b394978236907d237acd270269a5e22049a27c3` sur `FRONTEND-iA`. Relecture distante : 83140 octets, SHA `11980958…`, fichier identique, contenu réel.
- `tsc`, ESLint du fichier et `vite build` : exit 0. Rendu navigateur non exécuté (pas de Chromium).
- `main` inchangé (`ffe871c`). Aucune fusion, aucune PR. Types et `App.tsx` non réécrits (déjà restaurés dans `b1d8072`).

### 2026-11-15 — Types catégories et authState (typecheck vert)
- `MainCategoryId` / `SubCategoryId` dans `src/types/index.ts` alignés sur le catalogue, y compris loisirs et privé. `authState?.returnTo` dans `App.tsx`.
- Un push connecteur avait tronqué ces deux fichiers ; restauration puis commit `b1d8072`. Typecheck exit 0. Pas de changement UI dans ce commit.

### 2026-11-14 — Correction selectPages (pagination catégories)
- Ajout de `selectPages<T>` dans `src/features/events/queries.ts`.
- `fetchEventsByCategory` peut maintenant paginer correctement l'ensemble des événements publiés.
- Commit `07352871eefc8311497f5ca4c81f7b8bdd7d267f` sur `FRONTEND-iA`. Relecture distante confirmée (SHA `76ed8365…`, 13274 o).
- Aucun build/typecheck local exécuté dans cette session. Aucun changement sur `main`. Aucune PR.

### 2026-11-14 — Accueil : proportions et rangées équilibrées pour les catégories
- `src/screens/HomeScreen.tsx` : remplacement de la grille fixe 2/3/5 par un flex-wrap centré avec bases 2/3/4/6, gaps progressifs et largeur maximale 180/220/240px selon breakpoint. Les rangées incomplètes restent centrées; le cas de 5 catégories du screenshot n'isole plus la dernière tuile à gauche.
- Tuiles compactées : hauteur min 68px mobile, 72px sm, 76px 2xl; icône 16/17px, texte 10/11px, padding vertical et gap réduits. Titre et marge des résultats diminués.
- Sous-catégories : espacement/padding/font réduits; hauteur 36px conservée sans contrôle visuel réel.
- Audit manuel du code uniquement. Pas de build/typecheck/lint ni test visuel local; accès navigateur et réseau clone indisponibles. Superdesign/UIAudit non exposés. Vérification CI/Vercel post-commit à faire.
- Un commit substantiel combiné code + mémoire sur `FRONTEND-iA`; aucune PR et aucun changement sur une autre branche.

### 2026-11-14 — Auth clair/sombre et fusion main bloquée
- `AuthScreen.tsx` : panneau `glass-ios`, textes et champs adaptés au thème, champs en 16px, œil du mot de passe 44px, rôles en colonne sous 480px puis 3 colonnes, focus visible, `aria-invalid`. Commit `d369889` sur `FRONTEND-iA`. Taille 7129 → 12889 octets, relue sur le dépôt.
- `main` a 2 commits d'avance. Conflit `server.ts` seulement. Fusion non poussée.

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
- Le frontend appelle `supabase.functions.invoke('platform-stats')`; si invocation échoue ou si `data.totalUsers`/`data.totalTickets` n'est pas un nombre, l'UI affiche des tirets.

### 2026-11-13 — Reconstruction backend des statistiques globales
- Cause racine des tirets : fetchPlatformStats() dépendait de supabase.functions.invoke('platform-stats') et renvoyait silencieusement isAvailable:false sur toute erreur/incohérence. L'UI affichait alors des tirets.
- Schéma Supabase inspecté : tables events, tickets, ticket_options, profiles, organizations, artists, event_reactions. La base contient 8 événements de seed, 6 artistes et 3 organisations seed, 0 comptes Auth et aucun ticket réel identifié.
- Migration supabase/migrations/20261113090000_rebuild_platform_analytics.sql ajoutée sur FRONTEND-iA (commit 0f49f06450acc589908ae9aca2a747b3bbc2aae4) et appliquée au projet Supabase. Ajoute is_demo, marque les IDs de seed connus, crée event_view_daily avec unicité (event_id, visitor_key, viewed_on), RPC record_event_view et RPC SQL get_platform_stats.
- Vérification SQL réussie : get_platform_stats() renvoie isAvailable:true, 0 événement réel, 0 billet, 0 vue, 0 utilisateur, 0 profil, 0 revenu et timelines vides.
- src/features/events/queries.ts (commit 4a227dd59c7c949ce1cd3721eec0ee7ff7725785) utilise maintenant la RPC SQL get_platform_stats.
- src/features/events/interactions.ts (commit 4e5dc989d3bcf1c02b362848091037481f55fecf) enregistre les vues via record_event_view avec identifiant visiteur anonyme local et déduplication par événement/jour.
- supabase/functions/platform-stats/index.ts (commit 8780cb6668e4b1d9db3168bdde854d34be3685bd) délègue à la même RPC SQL; Edge Function déployée en version 5 ACTIVE.
- src/components/GbaigbanceStatsDashboard.tsx (commit 105e337b556900f63b5c588bea00fd6392260044) clarifie les définitions : billets valides, vues par navigateur/jour, paiements confirmés uniquement, événements publiés non terminés.
- totalRevenue est volontairement à 0 car le flux de paiement réel Mobile Money/confirmation n'est pas relié. Ne pas interpréter une réservation gratuite comme un revenu.
- Déploiement Vercel branch FRONTEND-iA : RPC client commit 4a227dd… READY ; migration commit READY. Commit UI 105e337… QUEUED lors du dernier contrôle. Attendre READY avant de demander le test Safari. Production alias sur main non modifié. Aucun PR, aucun changement sur main.
- Limite : identifiant visiteur local = déduplication ordinaire quotidienne, pas protection anti-bot forte. Organizer dashboard non reconstruit dans cette intervention; priorité = statistiques publiques.


### 2026-11-15 — Dock mobile : espace de scroll de l'accueil
- Capture iPhone fournie par l'utilisateur (828×1792) : le dock flottant fixed (surface 62px + padding bas dépendant safe-area) recouvre la suite du contenu de l'accueil dans la zone Explorer par catégorie; en fin de scroll, le contenu doit pouvoir remonter au-dessus du dock.
- `src/screens/HomeScreen.tsx` : ajout au conteneur racine d'un padding bas adaptatif `pb-[calc(7rem+env(safe-area-inset-bottom,0px))]` pour réserver environ la hauteur du dock et la safe area, sans changer le dock lui-même ni le modèle de navigation.
- Commit direct sur `FRONTEND-iA` : `4297a9a1ccc45d168d150b66e578a8ca7cb52a3f`.
- Limites : aucun contrôle visuel sur iPhone/browser ni build/typecheck/lint exécuté après ce patch. Relecture distante du code et de cette mémoire à effectuer. Pas de PR, pas de backend touché.
- Prochaine étape : contrôle navigateur aux largeurs 320–414px et vérifier en bas de page que la dernière section peut défiler au-dessus du dock; ajuster la réserve si le dock ou safe-area diffère.


### 2026-11-15 — Dock mobile : correction globale et safe area
- Relecture de la capture utilisateur : le dock fixe devait mieux respecter la zone sûre inférieure iOS et l'espace de scroll devait être garanti sur les quatre onglets, pas seulement Accueil.
- `src/App.tsx`: remplacement du `pb-24` du wrapper commun des onglets par `pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]` pour réserver une marge liée à la safe-area et à la hauteur du dock sur Accueil, Explorer, Billets et Favoris.
- `src/components/BottomNav.tsx`: augmentation du recul inférieur du dock de `max(0.5rem, calc(env(safe-area-inset-bottom) * 0.75 + 0.25rem))` à `max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))`; sur appareils avec inset bas (iPhone), le dock est remonté au-delà de l'encoche du bas avec marge de confort.
- `src/screens/HomeScreen.tsx`: retrait du padding-bottom spécifique ajouté lors de l'intervention précédente, qui doublonnait la réserve du wrapper général.
- Commits directs sur `FRONTEND-iA`: `32011640b1481365853684f87449111ccffca19d` (wrapper onglets), `609bef29588c290f7413ed16313eaf1773da01ee` (dock safe area), `c8798711b9357523cfa2c285665e5920f47edead` (suppression padding Accueil redondant).
- Tests locaux, build et contrôle visuel iPhone non exécutés dans cette session. Statuts Vercel à consulter après écriture. Pas de PR, pas de backend ni de dépendances modifiés.
- Prochaine priorité de backlog : évaluer rendu mobile par déploiement/browse si accessible, sinon poursuivre un chantier UX substantiel sans demander de validation manuelle à l'utilisateur.


### 2026-11-15 — Fond supérieur iOS et dock mobile compact
- Captures iPhone analysées : la bande de safe area/statusbar paraissait trop blanche par rapport au haut du dégradé violet; le dock Liquid Glass occupait trop de hauteur et ses éléments étaient visuellement généreux.
- `index.html` : couleur de thème clair alignée sur `#efe7ff` (mode sombre conservé).
- `src/index.css` : nouvelle variable `--safe-area-bg` (clair `#efe7ff`, sombre `#0c0a14`) utilisée pour le fond racine exposé dans les zones sûres iOS, sans supprimer le dégradé du body.
- `src/components/BottomNav.tsx` : surface dock réduite de 62 à 56px; icônes de navigation de 20 à 18px; labels de 11 à 10px; pastille centrale visuelle de 44 à 40px, tout en gardant le bouton Créer avec une cible tactile 44×44; ombres moins lourdes; position basse réduite à `max(0.5rem, env(safe-area-inset-bottom, 0px))`.
- `src/App.tsx` : réserve de défilement commune ajustée de 4.5rem à 3.5rem + safe-area, cohérente avec le dock compact.
- Commits de code directs sur `FRONTEND-iA` : `8524fb9e0005fded2baae223b48f414dc33991f0` (theme-color), `51bc077cb53ac5daa9fa919d4cc00c1fb342cd2e` (fond safe-area), `50107bbae9824745b7d52360699660ffe4631989` (dock), `984dc451c62ebe1ee8414bb516c004239f3efa7a` (scroll reserve).
- Tests locaux, build/typecheck/lint et contrôle navigateur/iPhone non exécutés ici. Les captures fournies ont servi à l'analyse visuelle, mais aucune capture après modification n'a été obtenue. Vérifier les statuts Vercel/CI avant de déclarer le build réussi.
- Aucune PR, aucun backend, dépendance ou lockfile touché. `main` non modifié.


### 2026-11-15 — Restauration Liquid Glass et en-tête sur FRONTEND-iA
- Clarification utilisateur : la destination attendue est `FRONTEND-iA`, et non `main`. Les changements de cette session ont donc été portés sur `FRONTEND-iA`; aucune nouvelle modification de `main`.
- `src/components/BottomNav.tsx` : restauration du composant Liquid Glass depuis la référence `main` : surface 62px, icônes 20px, labels 11px, ombres, bouton Créer et traitement visuel d'origine. La référence `main` contient le léger abaissement demandé (`max(0.25rem, calc(env(safe-area-inset-bottom, 0px) * 0.6)))); il est conservé.
- `src/index.css` : suppression de la variable `--safe-area-bg` ajoutée lors de la correction précédente et restauration du fond racine `var(--bg)`, afin de retrouver le comportement d'en-tête/safe-area de la référence.
- `index.html` : restauration du theme-color clair `#f4f1ff`.
- `src/screens/HomeScreen.tsx` et `src/App.tsx` non remplacés : les changements fonctionnels propres à FRONTEND-iA sont préservés; l'en-tête visuel n'exigeait pas de remplacer ces fichiers.
- Commits directs sur `FRONTEND-iA` : `43483a1e2677ed88d9518d8ca888a32ddcd383df` (dock), `3f721c10ab1674bfffb7befa08dab561531deccc` (fond safe-area), `a44082f715e44275076114238cc2b7a3052ea18b` (theme-color).
- Build/tests et capture visuelle non exécutés ici. Déploiement Vercel de la branche à vérifier; ne pas annoncer READY avant confirmation.
- Aucune PR; aucun changement backend, dépendance ou lockfile.
