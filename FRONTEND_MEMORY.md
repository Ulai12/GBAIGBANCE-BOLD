# FRONTEND_MEMORY.md

## Projet et périmètre
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Branche de travail autorisée : `FRONTEND-iA` uniquement.
- Frontend observé : React 18, TypeScript, Vite, Tailwind CSS 3.4.
- Le parcours « Explorer par catégorie » de l'accueil est implémenté dans `src/screens/HomeScreen.tsx`.
- Les six catégories parentes et leurs sous-catégories sont définies dans `src/constants/categories.ts`. Les identifiants et l'ordre de cette hiérarchie constituent les données métier à préserver.
- Le filtrage de la liste utilise déjà `selectedCategory`, `selectedMainCategory` et `eventMatchesCategoryFilter`; le chantier UI ne nécessite pas de changement backend/API.

## 2026-11-17 — Densité et hiérarchie de l'exploration par catégorie
### Constat avant intervention
- La grille d'accueil passait de 2 à 3 puis 6 colonnes dès le breakpoint `lg`, avec six cartes verticales, une largeur plafonnée à 220 px et des hauteurs minimales croissantes.
- Les libellés longs pouvaient s'empiler sous l'icône, ce qui augmentait la hauteur perçue et déséquilibrerait la grille selon le viewport.
- Les sous-catégories restaient en bande horizontale défilante à toutes les largeurs, sans libellé visuel explicitant leur relation à la catégorie parente.
- Le fichier mémoire précédent ne contenait qu'un placeholder ; aucune décision frontend exploitable n'y était documentée.

### Intervention réalisée
- Recomposition des cartes parentes en lignes compactes : icône dans un support discret, libellé aligné à gauche et retour à la ligne naturel.
- Grille adaptée : 2 colonnes sur petit écran, 3 sur tablette et écran intermédiaire, 6 à partir de `xl`; largeur maximale par carte portée à 280 px pour éviter l'étirement excessif en grille à 3 colonnes.
- Hauteur minimale des cartes ramenée à 48 px, tout en laissant le contenu long déterminer la hauteur réelle.
- Ajout d'un intitulé « Sous-catégories · [parent] » ; les sous-catégories gardent une cible tactile minimale de 44 px, défilent sur mobile et passent en retour à la ligne à partir de `sm`.
- Préservation des IDs, labels, icônes métier existantes, états actifs, callbacks, logique de sélection et filtrage. Aucun changement backend/API.

### Fichiers concernés
- `src/screens/HomeScreen.tsx` — présentation de la grille parent/enfant.
- `FRONTEND_MEMORY.md` — mémoire frontend initialisée puis mise à jour avec les observations et résultats du chantier.

### Vérification et limites
- Lecture des sources et vérification du HEAD effectuées sur `FRONTEND-iA`; HEAD de départ : `35d17160d4d90e1d7931762abecb2c95d8ad4565`.
- Diff Git limité à `src/screens/HomeScreen.tsx` et `FRONTEND_MEMORY.md`.
- Prévisualisation Vercel construite avec succès sur le code UI de ce chantier : état `READY`, commande `vite build && tsx scripts/generate-preview.ts`, 3 291 modules transformés, build terminé en 14 s, 63 entrées PWA précachées et 14 fichiers de preview synchronisés.
- Le pipeline Vercel n'a pas exécuté explicitement `npm run typecheck`, `npm run lint` ni une suite de tests dédiée ; ne pas les considérer comme validés.
- Aucun contrôle visuel navigateur n'a été réalisé : le navigateur connecté n'est pas accessible dans ce contexte d'exécution. Les breakpoints et états doivent encore être vérifiés sur captures réelles.
- Aucun audit UIAudit/Superdesign n'a été exécuté : ces outils/workflows ne sont pas exposés dans l'environnement courant.
- Aucun changement backend/API, aucun PR et aucun changement de branche secondaire.

### Prochaine priorité
- Vérifier le rendu réel sur mobile étroit, tablette et desktop, notamment les libellés longs, l'alignement des six parents et le retour à la ligne des sous-catégories.
- Exécuter séparément typecheck, lint et tests ciblés lorsqu'un environnement de test local/CI sera disponible.


## 2026-11-17 — Restauration et gel de l'apparence des cartes de catégorie
- À la demande explicite de l'utilisateur, le bloc complet « Explorer par catégorie » de `src/screens/HomeScreen.tsx` a été restauré à l'identique depuis le commit de référence pré-modification `35d17160d4d90e1d7931762abecb2c95d8ad4565`.
- Cela rétablit l'apparence verticale originale des cartes (icône au-dessus du libellé), les classes de dimensions/espacements et la grille originale (2 colonnes mobile, 3 à partir de sm, 6 à partir de lg), ainsi que l'affichage original des sous-catégories.
- Préférence durable : ne plus modifier l'apparence, les proportions, la disposition ou le style des cartes de catégorie ni leur présentation dans « Explorer par catégorie », sauf demande explicite ultérieure de l'utilisateur.
- Aucun autre parcours, donnée métier, filtrage, backend ou API n'a été modifié.
- Commit de restauration : `996a6815550895f10b7ab5bcdfee82b9d9a676dd`, directement sur `FRONTEND-iA`; aucun PR.
- Vérification : le bloc restauré provient exactement du commit de référence. Aucun build, typecheck, lint, test automatisé ni contrôle visuel navigateur n'a été exécuté après cette restauration.
- Prochaine priorité : laisser les cartes de catégorie intactes ; ne les retoucher que sur demande explicite.


## 2026-11-17 — Contrôle qualité hors section catégories
- Demande utilisateur : poursuivre le contrôle responsive/qualité sans toucher à « Explorer par catégorie ». Gel confirmé : aucun fichier source de cette section, aucune carte parent/enfant, aucun style, dimension, espacement, breakpoint, libellé ou comportement de catégorie n'a été modifié pendant cette session.
- Branche vérifiée : `FRONTEND-iA` existe ; HEAD observé avant cette note : `86df65016a7db8caade02ddd3682d28abd25d728`.
- Déploiement Vercel associé au commit de restauration source `996a6815550895f10b7ab5bcdfee82b9d9a676dd` : `READY`. Logs : Vite 8.3.7, 3 291 modules transformés, build Vite terminé en 6,43 s, PWA 63 entrées précachées, 14 fichiers preview synchronisés. Statut Vercel du HEAD mémoire `86df65016a7db8caade02ddd3682d28abd25d728` : success ; déploiement associé : `READY`.
- Limite importante de l'environnement : le dépôt contient `bun.lock` mais pas de `package-lock.json`. Le build Vercel observé a utilisé Bun 1.4.4 et a généré son lockfile dans l'environnement de build. Conformément à la règle npm-only (et à l'interdiction de créer/modifier des lockfiles), aucun `npm install`, `bun install` ou contournement de lockfile n'a été tenté. `npm ci`, `npm run typecheck` et `npm run lint` n'ont donc pas pu être exécutés dans un environnement propre ; typecheck et lint restent non vérifiés.
- Contrôle visuel multi-viewport non effectué : l'extension navigateur n'était pas accessible depuis cette session. Aucun résultat de test visuel n'est revendiqué.
- Audit source exploratoire limité aux composants non-catégorie de l'accueil (EventCard, FeaturedCarousel, TrendingDeck, NearbyEventTile, BottomNav et App). Aucun défaut visuel certain ne justifiait une modification sans rendu navigateur réel ; aucun code source n'a été modifié.
- Aucun PR, aucun changement de branche, aucun changement backend/API.
- Prochaine étape recommandée : obtenir un environnement de test autorisé avec dépendances installées selon le workflow npm du projet (sans créer de lockfile), puis faire les contrôles visuels sur les sections non-catégorie uniquement. La section catégories reste gelée sauf demande explicite.


## 2026-11-17 — Réduction du préchargement du carrousel vedette
### Constat
- `src/components/FeaturedCarousel.tsx` créait un nouvel objet `Image` pour chaque couverture de la liste vedette (jusqu'à six images) dès le montage du carrousel.
- Ce chargement anticipé utilisait les URLs sources complètes, sans attendre que les diapositives soient affichées; il contournait donc le chargement responsive déjà géré par `SmartImage` et consommait des données/mémoire sur mobile.
- La couverture visible reste chargée avec `loading="eager"` et `fetchPriority="high"` via `SmartImage`.

### Intervention réalisée
- Suppression du préchargement spéculatif de toutes les couvertures. Les diapositives, le défilement automatique, le glissement et la priorité de l'image visible restent inchangés.
- Seul `src/components/FeaturedCarousel.tsx` a été modifié côté application. « Explorer par catégorie » et son code n'ont pas été touchés.
- Commit direct sur `FRONTEND-iA` : `49772107e2a08c9af37a7c4580053c654ead2e11`.

### Vérification et limites
- Déploiement de prévisualisation Vercel du commit terminé avec le statut `success` le 17 novembre 2026.
- Aucun typecheck, lint, test automatisé dédié ni contrôle visuel navigateur n'a été exécuté dans cette session; le déploiement confirme la compilation/déploiement configuré, pas ces contrôles additionnels.
- Aucune modification de « Explorer par catégorie », du backend ou de `main`; aucun PR n'a été créé pendant cette intervention.


## 2026-11-17 — Fluidité du défilement, autoplay et thème système
### Constats
- `useScrollGlass` mettait à jour un état `scrollY` à chaque événement de défilement. Sur la fiche événement, seule la bascule de l'en-tête après 260 px était nécessaire.
- Le carrousel vedette continuait son intervalle en arrière-plan et avec la préférence système de réduction des animations.
- Le thème persisté était appliqué, mais une première visite sans choix enregistré démarrait toujours en clair et ne suivait pas un changement du thème système.

### Interventions
- Le hook de défilement ne met désormais à jour React que lorsque le seuil franchit; la parallaxe CSS existante reste indépendante et planifiée avec `requestAnimationFrame`.
- L'en-tête compact de la fiche événement utilise ce seuil de 260 px.
- L'autoplay du carrousel s'arrête lorsque l'onglet est masqué, lorsque l'utilisateur réduit les animations ou pendant une interaction; il reprend lorsqu'il est pertinent.
- Sans préférence enregistrée, le thème initial reprend le réglage système et suit ses changements. Le bouton de thème existant constitue le choix manuel et le conserve.
- Fichiers modifiés : `src/hooks/useScrollGlass.ts`, `src/screens/EventDetailScreen.tsx`, `src/components/FeaturedCarousel.tsx`, `src/contexts/AppContext.tsx`.
- Commit direct sur `FRONTEND-iA` : `ec8509da0d7eb858cd64509fff145125d43e3db6`. La section « Explorer par catégorie » n'a pas été modifiée.

### Vérification et limites
- Déploiement Vercel du commit : état `READY`.
- L'URL de preview est protégée et a redirigé le navigateur vers la connexion Vercel; aucun rendu visuel n'a donc été confirmé.
- Pas de typecheck, lint ou tests automatisés exécutés; l'état `READY` confirme le build/déploiement configuré, pas ces contrôles supplémentaires.
- Aucun changement sur `main`; aucun PR créé ou fusionné pendant cette intervention.


## 2026-11-17 — Traduction et chargement du carrousel vedette
### Intervention
- Le carrousel s'appuie maintenant sur les traductions centralisées pour le badge, le prix d'entrée, l'action de réservation, le libellé accessible et les indicateurs de diapositives.
- Les dates et montants XOF utilisent la locale française ou anglaise. Les identifiants de catégories connus réutilisent les traductions déjà disponibles.
- Le fond flouté réutilisait la couverture à sa résolution source et ajoutait une couche GPU floutée. Il a été remplacé par un dégradé statique; la couverture responsive principale et son chargement prioritaire restent en place.
- Clés ajoutées dans les fichiers d'événements FR/EN; « Explorer par catégorie » reste intacte.
- Fichiers concernés : `src/components/FeaturedCarousel.tsx`, `src/locales/fr/events.json`, `src/locales/en/events.json`.
- Commit direct sur `FRONTEND-iA` : `d0d765802d12800fdc6b347317b2f96ac98de78c`.

### Vérification et limites
- Déploiement Vercel du commit : état `READY`.
- Contrôle visuel manuel de la preview mobile après ce commit : carrousel affiché en français puis en anglais; badge, date, montant XOF, réservation, libellé accessible et indicateurs de diapositives traduits/formattés; affichage clair et sombre vérifiés. Langue française rétablie après vérification. Le navigateur a été redirigé depuis l'onboarding vers l'accueil avant le contrôle.
- Aucun typecheck, lint ou test dédié exécuté. Aucun changement sur `main`, aucun PR créé ou fusionné.

## 2026-11-17 — Localisation du carrousel tendances
- Le bloc « Tendances » et ses cartes utilisent maintenant les catalogues français/anglais pour les titres, boutons, annonces de position, consignes, états favoris et libellés de lieu.
- Les dates et tarifs XOF suivent la langue active. Le formatage de devise est partagé avec le carrousel vedette via `formatCurrency`.
- Les images du carrousel demandent des variantes adaptées à la largeur de la carte; la logique de sélection, le comportement de glissement et les cartes de « Explorer par catégorie » restent inchangés.
- Vérification : preview Vercel du commit `b84769cb697445a32ed66ab6cc1cb251c5259199` à l'état `READY`; contrôle visuel et d'accessibilité sur mobile en français et en anglais, montant/date et actions confirmés, français rétabli dans la preview.
- Aucune suite de tests, aucun typecheck ni lint exécuté. La localisation globale des autres pages reste à poursuivre.
- Mise à jour de périmètre confirmée par l'utilisateur : les textes de « Explorer par catégorie » peuvent être traduits; apparence, dimensions, animations, interactions et logique restent à préserver.

## 2026-11-18 — Localisation de l'écran Mes billets
### Intervention
- Ajout des catalogues `src/locales/fr/tickets.json` et `src/locales/en/tickets.json`.
- Intégration du domaine `tickets` dans `src/locales/index.ts`.
- `TicketsScreen.tsx` utilise désormais `t('tickets', key)` pour le titre, les onglets, les états vides, la bannière hors-ligne, la modale de réclamation et tous les toasts.
- L'écran suit la langue active de l'application (FR/EN).
- Section « Explorer par catégorie » non touchée (gel confirmé).

### Fichiers concernés
- `src/screens/TicketsScreen.tsx`
- `src/locales/fr/tickets.json`
- `src/locales/en/tickets.json`
- `src/locales/index.ts`
- `FRONTEND_MEMORY.md`

### Vérification
- Commit initial des JSON + index : `4f17ab55...`
- Incident temporaire de troncature sur TicketsScreen.tsx (placeholder) — restauré immédiatement via API GitHub.
- Commit de restauration/final : `358dd57aef240d0cecb5631da7619d0e19f204f2`
- Relecture distante : taille ~19383 octets, contenu contient bien les appels `t('tickets', ...)`, pas de placeholder. OK.
- Aucun typecheck/lint/test/rendu navigateur exécuté dans cette session.

### Prochaine étape
- Poursuivre la localisation des autres écrans clés (EventDetail, Profile, etc.).
- Vérifier le rendu réel de l'écran Billets en FR et EN sur mobile.

## 2026-11-18 — Localisation de l'écran Profil
### Intervention
- Ajout des catalogues `src/locales/fr/profile.json` et `src/locales/en/profile.json`.
- Enregistrement du domaine `profile` dans `src/locales/index.ts`.
- `ProfileScreen.tsx` utilise désormais `t('profile', key)` pour tous les textes visibles : bienvenue, onglets, états vides, invitations, raccourcis, toasts, modale QR, etc.
- Gestion des pluriels et placeholders via replace simple.
- Section « Explorer par catégorie » non touchée.

### Fichiers concernés
- `src/screens/ProfileScreen.tsx`
- `src/locales/fr/profile.json`
- `src/locales/en/profile.json`
- `src/locales/index.ts`
- `FRONTEND_MEMORY.md`

### Vérification
- Commits : d7592ba8 (fr), 705fafe3 (en), ffd87923 (index), 84f77531 (ProfileScreen).
- Contenu relecturé : appels t('profile', ...) présents, pas de troncature. OK.
- Aucun typecheck/lint/test/rendu navigateur exécuté dans cette session.

### Prochaine étape
- Continuer la localisation d'EventDetailScreen et autres écrans clés.
- Vérifier le rendu réel de l'écran Profil en FR et EN sur mobile.

## 2026-11-18 — Blocage P0 du build Vercel avant reprise de la localisation
### Constat
- Branche distante vérifiée : `FRONTEND-iA`, HEAD `4a23de457b1c394d8a5545c91481d2b7cff88d7b`.
- Le commit HEAD ne modifie que `BACKEND_MEMORY.md` (documentation) ; il ne contient aucun changement frontend susceptible d'expliquer l'échec de compilation.
- Le déploiement Vercel associé à ce HEAD est en état `ERROR`. Vite 8.3.7 transforme 3 299 modules puis échoue avec quatre erreurs `MISSING_EXPORT`.
- Deux fonctions manquent dans le graphe d'exports :
  - `setEventStatus` est réexportée depuis `src/services/events.ts` via `@/features/tickets`, mais n'existe pas dans `src/features/tickets/service.ts` ni dans les modules de statut/mutations de `src/features/events`. `EventManagementModal.tsx` l'importe également depuis `src/services/events.ts`.
  - `validateTicketQr` est importée par `src/services/ticketScannerService.ts`, mais n'est pas exportée par `src/features/tickets/service.ts` et aucune implémentation correspondante n'a été trouvée dans les modules tickets présents sur cette branche.
- Les quatre diagnostics Vite sont donc deux exports manquants référencés à plusieurs endroits, pas quatre problèmes indépendants.
### Décision et périmètre
- Aucun correctif improvisé : `validateTicketQr` participe à la validation des billets à l'entrée et son contrat de sécurité/RPC doit être confirmé avant toute réimplémentation. Le contrat de `setEventStatus` doit également être rétabli depuis sa source propriétaire.
- Aucun fichier applicatif, service backend/API ou schéma Supabase modifié pendant cette session.
- La section « Explorer par catégorie » reste gelée et n'a pas été touchée.
- UIAudit et Superdesign ne sont pas disponibles dans le catalogue des outils/skills de cette session ; aucun audit ou draft de ces outils n'est revendiqué.
### Vérifications et limites
- Diagnostic confirmé par les logs du déploiement Vercel `dpl_5kX9k1GBQNmUnnrTpvwJeA3Mzxi5` et par la lecture des imports/exports sur `FRONTEND-iA`.
- Aucun build, typecheck, lint, test automatisé ou contrôle visuel n'a pu valider une nouvelle modification, car le build existant est déjà bloqué avant déploiement.
- Aucun changement de branche, aucun PR et aucune écriture sur `main`.
### Prochaine priorité
- Faire rétablir les exports `setEventStatus` et `validateTicketQr` avec leur contrat exact, sans inventer de RPC ni affaiblir la validation des billets.
- Une fois le build rétabli, reprendre la localisation FR/EN d'`EventDetailScreen`, puis poursuivre les optimisations de défilement et de cartes hors section catégories.



## 2026-11-18 — Restauration des exports manquants bloquant la compilation
### Diagnostic
- PR #14 vers `main` : GitHub signale `mergeable_state: dirty`; la comparaison indique 150 commits d'avance et 16 de retard. La branche est donc divergente et présente des conflits à résoudre avant fusion.
- Le statut Vercel du HEAD précédent `936f5f1a0847b1b860d3151ea9f0159234adee82` est `failure`.
- `src/services/events.ts` réexporte `setEventStatus` et `validateTicketQr` depuis `@/features/tickets`, mais ces deux fonctions avaient été supprimées de `src/features/tickets/service.ts`. `src/features/tickets/index.ts` exporte le service via `export *`, donc les deux absences provoquent les erreurs de compilation.
- La migration `20260906120000_gbaigbance_event_lifecycle_and_inventory.sql` définit bien la RPC `set_event_status` avec les paramètres `p_event_id`, `p_status`, `p_reason`.
### Correctif réalisé
- Restauration de `setEventStatus` dans `src/features/tickets/service.ts`, avec appel à la RPC serveur `set_event_status` et propagation des erreurs/résultats refusés.
- Restauration de `validateTicketQr` dans le même service, avec appel à la RPC `validate_ticket_qr`; aucune validation positive locale ni contournement de sécurité n'est simulé.
- Import du type `EventStatus` depuis `@/types`.
- Commit direct sur `FRONTEND-iA` : `b76845e72f35c0bdb152e77158652285c41e46c8`.
### Vérification et limites
- HEAD de `FRONTEND-iA` contrôlé avant écriture : `936f5f1a0847b1b860d3151ea9f0159234adee82`; HEAD après écriture : commit du correctif ci-dessus.
- Relecture du fichier modifié et présence des deux exports : à effectuer après ce commit.
- Le déploiement Vercel du commit `b687962a0d926d4a1fa8424531dac3afd4deb0b4` a ensuite terminé en `READY` (déploiement `dpl_6k8EkYRtCTu2uzQT8GLpJjWNn93S`); les logs confirment `vite build && tsx scripts/generate-preview.ts`, 3 299 modules transformés, build Vite terminé en 3,99 s et génération PWA/preview terminée. Le statut Vercel du commit est `success`.
- La disponibilité réelle de la RPC `validate_ticket_qr` dans le projet Supabase n'a pas été confirmée pendant cette intervention; le client reprend le contrat déjà attendu par le scanner.
- Aucun changement backend, migration ou donnée Supabase. Aucun changement à `main`. `PROJECT_MEMORY.md` n'a pas été lu ni modifié.
- La divergence Git et les conflits de la PR #14 ne sont pas résolus par ce correctif. Aucun outil de fusion/résolution de conflits n'est exposé dans cette session; ne pas créer un merge commit artificiel ni réécrire l'historique.
### Prochaine priorité
- Obtenir un merge réel de `main` vers `FRONTEND-iA` avec résolution explicite des conflits, en protégeant les fichiers mémoire appartenant à d'autres agents; puis recontrôler la PR #14 et le build Vercel.


### Contrôle complémentaire après le correctif (2026-11-18)
- Relecture distante de `src/features/tickets/service.ts` : les exports `setEventStatus` et `validateTicketQr` sont présents.
- Déploiement Vercel du commit `b687962` : `READY`; statut Vercel : `success`. Cela valide la compilation Vite configurée, pas un typecheck, lint ou test dédié.
- PR #14 toujours `mergeable: false`; la divergence reste à 152 commits d'avance et 16 de retard. Le statut `dirty` indique des conflits non résolus.
- Aucun merge de branches n'a été effectué. La session ne dispose pas d'un workflow de résolution/merge de branches qui permette de fusionner proprement les changements de `main` vers `FRONTEND-iA`; aucun merge commit artificiel n'a été créé.

## 2026-11-19 — Rééquilibrage responsive d’Explorer par catégorie
### Constat
- Le parcours est rendu dans `src/screens/HomeScreen.tsx`; les six catégories métier et leurs sous-catégories restent définies dans `src/constants/categories.ts`.
- La grille basculait à six colonnes dès `lg` (1024 px), ce qui réduisait la largeur utile de chaque carte et provoquait des retours à la ligne prématurés sur les libellés.
- Les cartes avaient des min-heights croissantes par breakpoint et un padding vertical qui amplifiait la hauteur des lignes.
- Les sous-catégories étaient forcées sur une seule ligne avec défilement horizontal; les éléments longs restaient partiellement masqués.
- Le mapping d’icônes de l’accueil ne contenait pas `Sparkles`, icône de la catégorie « Loisirs & Découvertes », qui tombait donc sur l’icône de secours Palette.

### Intervention réalisée
- Grille parentale désormais équilibrée en 2 colonnes sur mobile, 3 de `sm` à `lg`, puis 6 à `xl`; la grille intermédiaire est plafonnée à 780 px afin de garder des cartes regroupées plutôt qu’étirées.
- Cartes parentes ramenées à une hauteur minimale de 48 px avec padding vertical réduit; les libellés gardent leur retour à la ligne naturel et peuvent augmenter la hauteur uniquement si nécessaire.
- Sous-catégories passées en retour à la ligne responsive, sans défilement horizontal obligatoire; les boutons gardent une cible tactile minimale de 44 px et acceptent les libellés longs.
- Ajout d’un intitulé de sous-catégories lié à la catégorie parente, réutilisant le catalogue FR/EN existant.
- Ajout de `Sparkles` au mapping des icônes de l’accueil.
- Identifiants, ordre, libellés métier, couleurs, états actifs, callbacks, filtrage et données inchangés. Aucun backend/API ni `src/constants/categories.ts` modifié.
- Cette intervention suit la demande explicite de ce chantier, qui réautorise l’ajustement visuel après le gel précédent des cartes.

### Fichiers concernés
- `src/screens/HomeScreen.tsx`
- `FRONTEND_MEMORY.md`

### Vérifications et limites
- Branche cible contrôlée avant intervention : `FRONTEND-iA`, HEAD de départ `e27b4085177e5dc61397e2339c205a1e4721cd84`.
- Contrôles statiques du diff : une seule section remplacée; grille responsive présente; ancien breakpoint six colonnes dès `lg` absent; min-height/padding compacts; sous-catégories enveloppées; sélection parent/enfant conservée; données métier intactes.
- Prévisualisation Vercel du commit candidat `6dc12d8eef9f9221d3318b41209de6de7503f8b7` : état `READY`; Vite 8.3.7 a transformé 3 303 modules et terminé le build en 4,11 s; PWA 63 entrées précachées; 14 fichiers de preview synchronisés. Le commit de branche final reprend exactement le même code applicatif; seule cette mémoire diffère.
- Le contrôle TypeScript Vercel a signalé `api/ai/assistant/stream.ts(1,25): TS5097`; le même diagnostic apparaît déjà sur le déploiement de référence du HEAD précédent `e27b4085177e5dc61397e2339c205a1e4721cd84`, qui est lui aussi `READY`. Ce problème préexistant n’est pas causé par ce chantier et le fichier API n’a pas été modifié.
- `npm run typecheck`, lint et tests dédiés non exécutés séparément.
- Contrôle visuel navigateur non réalisé : le navigateur connecté n’était pas accessible. La capture reçue pendant cette exécution concernait la résolution de conflits PR #14, pas le bloc catégories; aucune capture de ce bloc n’était disponible.
- UIAudit et Superdesign non disponibles dans les outils/skills exposés; aucun audit ni maquette de ces outils n’est revendiqué.
- Aucun changement à `main`, aucune autre branche, aucun PR; `PROJECT_MEMORY.md` n’a pas été lu ni modifié.

### Prochaine priorité
- Vérifier visuellement la section sur mobile étroit (320–390 px), tablette (768–1024 px) et desktop (1280 px et plus), surtout les libellés longs et la répartition des sous-catégories.
- Traiter séparément le diagnostic TypeScript TS5097 de `api/ai/assistant/stream.ts` dans un chantier autorisé, sans le mélanger à cette correction UI.


## 2026-11-19 — Restauration complète de HomeScreen
- Demande utilisateur : restaurer la page d'accueil comme avant le commit `46b7c59b936d1101a9a5f792ce01216e2528572e`.
- Constat : le commit demandé ne modifiait que `PROJECT_MEMORY.md`; sur `FRONTEND-iA`, `src/screens/HomeScreen.tsx` contenait une restauration incomplète avec marqueurs `RESTORE_MARKER` / `RESTORED PARTIAL` et un composant ne restituant qu'une partie de la page.
- Source de restauration : version complète de `src/screens/HomeScreen.tsx` récupérée depuis le commit `c1ba934e702073f468d6a4f8a7f607be96646d5e`, conformément à la référence de récupération déjà consignée dans le contexte frontend.
- Intervention : remplacement intégral de `src/screens/HomeScreen.tsx` sur `FRONTEND-iA` uniquement. Version restaurée : 49 382 caractères, 1 117 lignes, sans marqueur de restauration partielle.
- Commit : `3f41f4911a43adf6c8855f9fe343e1614ef7e243`.
- Vérification après écriture : relecture distante de `src/screens/HomeScreen.tsx` sur `FRONTEND-iA`; blob SHA confirmé `ba5e0ad6d0cf77435daacb29740375090a5023ed`, 1 117 lignes.
- Limites : aucun build, typecheck, lint, test automatisé ou contrôle visuel navigateur exécuté après restauration. La restauration rétablit le code complet de la source référencée; elle ne certifie pas à elle seule le rendu/runtime.
- Aucun autre fichier applicatif modifié; aucun backend/API, aucune PR, aucun changement sur `main`. `PROJECT_MEMORY.md` n'a pas été lu ni modifié.
- Prochaine priorité : exécuter les contrôles de compilation et vérifier visuellement la page d'accueil sur mobile et desktop avant toute autre évolution.


## 2026-11-19 — Restauration ciblée des catégories principales et centrage des sous-catégories
- Demande : remettre l'apparence des catégories principales telle qu'avant le commit `738790184ebc0dfb1f7d149c7ccabb4aa8843cbd`, conserver l'apparence actuelle des sous-catégories et centrer leur titre ainsi que leurs boutons.
- Source de référence pour les catégories principales : `src/screens/HomeScreen.tsx` au commit `35d17160d4d90e1d7931762abecb2c95d8ad4565`.
- Intervention dans `src/screens/HomeScreen.tsx` : restauration du markup/classes originaux de la grille et des cartes principales (2 colonnes mobile, 3 dès sm, 6 dès lg; min-heights 56/60/64 px; padding et proportions verticaux d'origine). Le mapping `Sparkles` déjà présent a été conservé.
- Sous-catégories : conservation du style actuel des boutons (arrondis, hauteur tactile minimale 44 px, retours à la ligne, couleurs et états sélectionnés); centrage du titre et du groupe de boutons via `text-center` et `justify-center`.
- Logique métier, IDs, ordre, sélection, callbacks, filtrage, traductions et données non modifiés. Aucun backend/API touché.
- Commit direct sur `FRONTEND-iA` : `b75d556a90d17e077acb6000ddebfee40b7312b6`.
- Vérification après écriture : relecture GitHub du fichier sur `FRONTEND-iA`; blob SHA `e24a9801c03e3f442a1696b3de467be19088cb27`; contrôles statiques confirmant les classes originales des cartes principales, le centrage des sous-catégories et l'absence de défilement horizontal forcé dans leur conteneur.
- Limites : aucun build, typecheck, lint, test automatisé ni contrôle visuel navigateur exécuté après ce changement.
- Aucun PR, aucun changement sur `main` ou autre branche; `PROJECT_MEMORY.md` non lu/non modifié.
- Prochaine priorité : vérifier visuellement le centrage des sous-catégories sur mobile étroit, tablette et desktop, ainsi que les retours à la ligne des libellés longs.


## 2026-11-19 — Localisation FR/EN de la page Home et de ses composants
### Périmètre et règles préservées
- Demande : traduire les textes de l'en-tête, des sections Home et de leurs composants, sans altérer l'apparence actuelle.
- Branche de travail : `FRONTEND-iA` uniquement.
- Aucun style Tailwind, layout, dimensions, espacement, couleur, animation, interaction, donnée métier, filtre ou comportement de composant n'a été volontairement modifié.
- La présentation et le libellé de l'en-tête « GBAIGBANCE EN CHIFFRES » sont laissés intacts conformément à la consigne antérieure de préserver cette zone.
- La section « Explorer par catégorie » conserve ses classes et proportions; seuls les libellés de catégories/sous-catégories et textes d'accessibilité passent par les catalogues FR/EN.

### Interventions
- `src/screens/HomeScreen.tsx` : en-tête de marque, salutation dynamique selon l'heure, profil, paramètres, recherche, assistant IA, à la une, exploration par catégories, sous-catégories, résultats de catégorie, tendances, proximité, recommandations, événements gratuits, à ne pas manquer, artistes et organisateurs.
- `src/components/EventCard.tsx` : dates localisées, gratuité, statuts, partage, lieu de secours et libellé accessible.
- `src/components/NearbyEventTile.tsx` : dates, prix, libellés de proximité, ville/catégorie de secours, prix « dès » et action Voir.
- `src/components/NotificationBell.tsx` : libellé accessible.
- `src/components/GbaigbanceStatsDashboard.tsx` : filtres de période, KPI, descriptions, graphique, états vides, unités et libellés des catégories; formatage dates/montants selon la langue.
- `src/components/SeeMoreModal.tsx` : titres/sous-titres, recherche, filtres, compteurs singulier/pluriel, états vides et boutons.
- `src/components/UserAvatar.tsx` : infobulle du compte vérifié.
- `src/components/OptimisticHeartButton.tsx` : libellés accessibles Ajouter/Retirer des favoris.
- `src/locales/fr/events.json` et `src/locales/en/events.json` : ajout des clés Home, statistiques, filtres, catégories et accessibilité.
- Les composants `FeaturedCarousel`, `TrendingDeck`, `TrendingDeckCard` et `BottomNav` possédaient déjà leurs traductions et n'ont pas nécessité de modification.

### Vérifications et limites
- Les deux catalogues JSON ont été parsés avec succès.
- Contrôle statique des appels `t('events', '...')` dans les fichiers modifiés : aucune clé statique manquante entre FR et EN.
- Contrôle statique de motifs JSX mal formés dans les attributs `className`, `title` et `aria-label` : aucun motif détecté.
- Relecture distante des fichiers modifiés sur `FRONTEND-iA` effectuée après les écritures.
- Aucun build, typecheck, lint, test automatisé ou contrôle visuel navigateur n'a été exécuté. La conformité du rendu visuel FR/EN reste donc à confirmer sur mobile et desktop.
- Aucun backend/API touché, aucun PR, aucun changement sur `main`; `PROJECT_MEMORY.md` n'a pas été lu ni modifié.

### Prochaine priorité
- Exécuter un build et un typecheck dans l'environnement autorisé, puis vérifier visuellement les versions FR et EN de Home sur mobile et desktop, en contrôlant notamment les longueurs de libellés et les débordements sans modifier le design.


### Complément de périmètre — composants secondaires de la modale « Voir plus »
- `src/components/NearbySeeMoreCard.tsx` : date/prix localisés, libellés accessibles, partage et lieu de secours.
- `src/components/OrganizerCard.tsx` : partage, région de secours, compteur d'événements, abonnés et actions Suivre/Suivi.
- Ces composants conservent leurs classes, dimensions, animations, structure et interactions.
