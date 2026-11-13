# FRONTEND_MEMORY.md

## Périmètre
Mémoire du travail frontend de GBAIGBANCE-BOLD. Ce fichier est la continuité du chantier frontend. `PROJECT_MEMORY.md` est consulté uniquement en lecture seule pour le contexte backend.

## Gouvernance
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Branche d'écriture exclusive : `FRONTEND-iA`. Ne jamais écrire sur `main`, ne jamais fusionner vers `main`, ne jamais faire de force push.
- Le 2026-11-13, la branche exacte `FRONTEND-iA` a été créée depuis `main` car elle n'existait pas. La branche `FRONTEND-iA` est distincte et n'a pas été modifiée.
- PR #9 — Frontend: équilibrer les catégories sur mobile — fusionnée dans `main` par le propriétaire. PR de suivi actuelle : [#11 — Frontend: évolutions UI/UX continues](https://github.com/Ulai12/GBAIGBANCE-BOLD/pull/11), ouverte en brouillon vers `main`, jamais fusionnée par cet agent.
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

## Tâche active — proportions de l'explorateur de catégories (Accueil)
**Objectif :** rendre les catégories principales plus compactes et équilibrées, puis présenter les sous-catégories dans une rangée horizontale homogène et utilisable au tactile, sans modifier la taxonomie ni le filtrage des événements.

**Progression :**
- Terminé le 2026-11-13 : réduction de la hauteur minimale des cartes principales de 104px à 80px ; icônes de 20px à 18px ; libellés resserrés et centrés ; grille 2 colonnes sur petit écran, 3 dès `sm`, 5 dès `xl`.
- Terminé : sous-catégories passées d'un groupe flex-wrap irrégulier à une rangée horizontale scrollable avec snap, hauteur minimale uniforme de 36px, libellés sans retour à la ligne.
- Terminé : focus visible ajouté aux contrôles de catégorie et libellés de groupe accessibles.
- À faire : vérifier le rendu réel aux largeurs 320, 360, 375, 414, 768, 1024 et 1440px, en clair/sombre et sur iPhone ; ajuster uniquement sur constat.
- À faire : exécuter build, lint et typecheck dans un environnement avec le dépôt et ses dépendances.

**Fichiers concernés :**
- `src/screens/HomeScreen.tsx` — section « Explorer par catégorie ».
- `src/constants/categories.ts` — taxonomie partagée, consultée sans modification.

**Dernière action :** reprise de validation le 2026-11-13 ; comparaison `main...FRONTEND-iA` confirmant `behind_by: 0`, vérification des contrôles GitHub et mise à jour de cette mémoire. Commit mémoire `ccbf22d161224926c24971ec89f7da4c7a323b31`, relu à distance avec contenu identique ; `HomeScreen.tsx` inchangé.

**Prochaine étape :** lancer les vérifications automatisées et effectuer une revue responsive réelle depuis un environnement d'exécution ou un navigateur connecté ; ne pas commencer un autre chantier avant validation ou blocage documenté.

## Design system — décisions à préserver
- Couleurs principales : violet `#6600FF`, violet secondaire `#8B5CF6`, surfaces sombres existantes `#14121E` / `#17131D`.
- Typographie : hiérarchie Tailwind existante ; titres de section compacts, libellés de catégories 11–12px sur mobile.
- Espacements : grille catégorie gap 8px mobile ; sous-catégories gap 8px ; padding horizontal de page 20px (classes `px-5`).
- Rayons : cartes de catégories `rounded-2xl`, sous-catégories en capsules `rounded-full`.
- Cibles tactiles : conserver au moins 44px pour les actions importantes ; les chips de sous-catégorie sont à 36px de hauteur visuelle et doivent rester confortables à toucher, à réévaluer lors du contrôle réel.
- Focus : anneau violet visible avec offset adapté au thème sombre.
- Mouvement : transitions courtes et ciblées ; respecter `prefers-reduced-motion`.
- Responsive actuel : grille catégories 2 colonnes par défaut, 3 à `sm`, 5 à `xl` ; sous-catégories défilantes horizontalement.
- Performance : éviter les effets coûteux et préserver les images lazy-loadées ; ne pas ajouter de dépendance pour une amélioration CSS.

## Cartographie des écrans
| Écran / zone | Statut | Notes |
|---|---|---|
| Accueil — explorateur de catégories | En cours | Proportions mises à jour ; contrôle responsive réel restant |
| Accueil — dock mobile | À revoir | Labels 11px, dock 62px, bouton Créer 44px ; contrôle visuel restant |
| Thème sombre / réduction de transparence | À revoir | Correctif CSS présent ; contrôle réel restant |
| Explorer / recherche | À auditer | Hiérarchie catégories et résultats à recontrôler |
| Création / modification d'événement | À auditer | Taxonomie partagée ; dernier commit main alignant l'édition sur la taxonomie |
| Billets / portefeuille | À auditer | Aucun changement dans cette session |
| Profil / favoris / notifications | À auditer | Aucun changement dans cette session |
| Dashboard organisateur / statistiques | À revoir | Correctifs stats/analytics déjà présents dans l'historique |

## Dette UI
- **P1** — Contrôler les débordements des libellés et des capsules de sous-catégories sur 320px.
- **P2** — Valider l'équilibre visuel de la grille catégories sur tablette et grands écrans.
- **P2** — Vérifier les contrastes en thème clair/sombre et la lisibilité avec réduction de transparence.
- **P2** — Contrôler le dock mobile et les safe areas iOS.
- **P3** — Harmoniser progressivement les états vides, chargement et erreur entre les écrans.

## Incidents d'écriture
- Aucun incident de troncature constaté pendant la session du 2026-11-13.
- Protocole de vérification distant appliqué au commit `5bfe0a46ba7a292a3f5105871be27fb0c2dddf7a`.

## Vérifications
- **Session du 2026-11-13 (reprise) :** branche `FRONTEND-iA` présente ; comparaison `main...FRONTEND-iA` = `ahead_by: 3`, `behind_by: 0` ; PR #9 toujours ouverte vers `main`.
- **Session du 2026-11-13 (reprise) :** contrôle GitHub du commit `e9192442628b74c5c0853feb0dbc931ecb68f133` : Vercel Preview Comments `success`, Supabase Preview `skipped` ; aucune GitHub Actions run trouvée pour `FRONTEND-iA`.
- **Non vérifié :** build, lint, typecheck, tests et rendu navigateur lors de cette reprise. Le navigateur connecté a refusé l'accès faute de contexte navigateur d'origine ; aucun environnement local de build n'est fourni par le connecteur GitHub.
- **Vérifié :** relecture GitHub distante de `src/screens/HomeScreen.tsx` sur `FRONTEND-iA`, hash du blob `64a8975cf457d5fa479c0923adef143fee62faac`, commit retrouvé dans l'historique.
- **Vérifié :** taille du fichier augmentée de 819 caractères et de 4 lignes ; aucune diminution ni référence d'espace réservé.
- **Non vérifié :** build, lint, typecheck, tests automatisés et rendu navigateur ; le connecteur GitHub distant ne fournit pas ici un environnement d'exécution frontend.
- **Non vérifié :** rendu aux largeurs 320, 360, 375, 414, 768, 1024 et 1440px, orientations tablette, thème clair/sombre et iPhone.

## Backlog
1. P1 — Vérification build, lint, typecheck et tests existants.
2. P1 — Revue responsive réelle de l'explorateur de catégories sur petits mobiles, notamment 320px.
3. P2 — Contrôle dock mobile, safe areas iOS et mode réduction de transparence.
4. P2 — Revue progressive des pages Explorer et création/modification d'événement.
5. P3 — Audit ciblé des états de chargement, vide, erreur et hors-ligne.

## Historique
### 2026-11-13 — Accueil : proportions des catégories
- Réduction de la hauteur minimale des cartes principales de 104px à 80px et des icônes à 18px.
- Sous-catégories uniformisées en rangée horizontale scrollable avec snap.
- Focus visible et sémantique de groupe ajoutés.
- Commit : `5bfe0a46ba7a292a3f5105871be27fb0c2dddf7a`.
- Relecture distante réussie ; validation build/lint/typecheck et rendu visuel non exécutés.

### 2026-11-12 — FRONTEND-iA : verre sombre et dock
- `prefers-reduced-transparency` : surcharge `.dark` dans `src/index.css` pour garder des surfaces sombres.
- Dock mobile (`src/components/BottomNav.tsx`) : labels 11px, dock 62px, aria-label du badge billets avec pluralisation fr/en.
- Validation navigateur (320, 375, 414, 768, 1024, 1440) et build/lint : non exécutés dans la session distante.

### 2026-11-12 — FRONTED-iA : cartes, catégories, stats
- `EventCard.tsx` : suppression du bouton imbriqué dans un `article role="button"`, overlay de découverte distinct, suppression de `min-h-[full]`.
- `BottomNav.tsx` : bouton Créer 44×44px, focus clavier, `prefers-reduced-motion`.
- Explorateur de catégories : hiérarchie parent/sous-catégorie, catalogue publié complet, plus de flicker ni de polling.
- Stats/analytics : historique organisateur par mois, pas d'échantillon partiel, repli JavaScript typé, billets uniques.

### 2026-11-13 — Fusion des historiques frontend
- L'ancien journal documentait une fusion `FRONTED-iA` vers `FRONTEND-iA` et la PR #6.
- La branche de travail exacte a été recréée depuis `main` au début de cette session, conformément à la consigne lorsque `FRONTEND-iA` est absente.


### 2026-11-13 — Synchronisation de main vers FRONTEND-iA
- Analyse des 8 commits manquants depuis `main` ; les modifications entrantes concernaient `FRONTEND_MEMORY.md`, `src/screens/EditEventScreen.tsx` et `src/screens/HomeScreen.tsx`.
- Résolution documentée : `src/screens/HomeScreen.tsx` reprend la version main qui contient la grille catégories 2/3/5 colonnes, les tuiles compactes de 80px et la rangée horizontale de sous-catégories. `src/screens/EditEventScreen.tsx` conserve la version FRONTEND-iA, qui garde l'import `Trophy` nécessaire et le fallback de catégorie legacy. La mémoire reprend le journal main, corrige le nom exact de la branche et conserve le blocage précédent ainsi que sa résolution.
- PR temporaire #10 fermée sans fusion ; elle n'a modifié aucune branche.
- Merge commit créé avec deux parents (branche de travail et main) ; aucune réécriture d'historique ni force push.
- Prochaine étape : valider build, lint, typecheck, tests et rendu responsive avant toute nouvelle retouche UI.

- PR de suivi #11 créée le 2026-11-13 depuis `FRONTEND-iA` vers `main`, ouverte en brouillon ; aucune fusion demandée ni effectuée.
