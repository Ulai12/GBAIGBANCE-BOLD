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
- Les libellés longs pouvaient s'empiler sous l'icône, ce qui augmentait la hauteur perçue et déséquilibrait la grille selon le viewport.
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
