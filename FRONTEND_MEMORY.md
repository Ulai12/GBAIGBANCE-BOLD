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
