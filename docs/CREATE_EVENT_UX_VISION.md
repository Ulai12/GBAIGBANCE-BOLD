# GBAIGBANCE-BOLD — Vision UX/UI de la création d'événement

> Document de référence pour les agents frontend, backend, design et QA.
> Branche de travail : `FRONTEND-iA` (nom exact GitHub).
> Statut : vision produit + audit initial du code existant. Ce document ne prétend pas que les améliorations proposées sont déjà implémentées.

## 1. Objectif produit

Faire de la création d'événement un parcours mobile-first, clair et fiable pour les organisateurs, artistes et équipes événementielles de Togo et d'Afrique de l'Ouest francophone.

La page doit réduire les erreurs de saisie, expliquer les choix métier, préserver les données saisies et rendre immédiatement compréhensible la configuration de l'événement et de sa billetterie.

L'image de référence fournie par l'utilisateur sert d'inspiration (formulaire élégant, couverture immersive, champs en cartes, accent dégradé violet/rose), pas de modèle à recopier pixel par pixel.

## 2. État existant vérifié sur FRONTEND-iA

Fichiers inspectés :
- `src/screens/CreateEventWizardScreen.tsx`
- `src/features/events/mutations.ts`
- `src/types/index.ts`

Le wizard actuel existe déjà et comporte neuf étapes : Informations, Lieu & Dates, Photos, Billets, Collaborateurs, Programme, Live, Sponsors, Confirmation.

Fonctionnalités visibles dans le code :
- Titre, description, capacité.
- Catégories principales et sous-catégories issues de `src/constants/categories`, avec synchronisation de la catégorie legacy.
- Lieu, adresse, ville, pays, latitude/longitude.
- Quelques coordonnées de villes prédéfinies et géolocalisation facultative du navigateur.
- Dates/heures de début et fin.
- Image de couverture (limite actuelle de 5 Mo), galerie (jusqu'à 8 photos), vidéo.
- Modes d'accès : billetterie GBAIGBANCE, gratuit, réservation WhatsApp, billetterie externe.
- Billets avec libellé, type, prix, quantité et description.
- Capacité illimitée ou limitée.
- Collaborateurs (co-organisateurs et artistes).
- Programme, liens live et sponsors.
- Prévisualisation et confirmation.

Persistance observée :
- La mutation `createEventWithCollaborators` insère l'événement dans `events`, puis les options de billets et les collaborateurs.
- Les événements sans collaborateurs sont créés avec le statut `published`; ceux avec collaborateurs sont créés avec le statut `pending`.
- Le service persiste notamment le lieu, l'adresse, la ville, le pays, les coordonnées, les dates, le prix minimum, les images, le type d'accès et les champs de capacité.
- Les créneaux de programme, liens live et sponsors sont ajoutés après la création principale via des appels séparés.

Limites constatées dans les extraits inspectés :
- Le bloc emplacement est actuellement une saisie manuelle + listes ville/pays + coordonnées GPS; aucune carte interactive ni recherche géocodée n'a été identifiée dans le code inspecté.
- Les coordonnées GPS de départ sont des valeurs de secours par ville, et le bouton de géolocalisation utilise la position de l'organisateur, pas nécessairement celle du lieu de l'événement. Ne jamais présenter ces coordonnées comme une position du lieu confirmée.
- La ville et le pays sont sélectionnés séparément; le changement de pays ne garantit pas actuellement une liste de villes filtrée.
- Aucune sauvegarde persistante de brouillon n'a été identifiée dans la mutation inspectée.
- La création principale et l'ajout des éléments optionnels sont plusieurs opérations successives : analyser les risques d'événement partiellement créé si une étape secondaire échoue.
- La logique de fuseau horaire doit être vérifiée avant de modifier le traitement des dates; les dates sont converties en ISO dans la mutation.

Ces observations sont limitées aux fichiers et extraits inspectés; vérifier les composants, migrations, traductions et autres services avant toute conclusion plus large.

## 3. Principes de design

- Identité GBAIGBANCE : violet `#6600FF`, variantes lavande/violet, accents bleu et magenta avec parcimonie.
- Support clair et sombre natif, sans divergence fonctionnelle.
- Cartes arrondies, surfaces subtiles, hiérarchie typographique nette, densité mobile maîtrisée.
- Contraste accessible, focus visible, labels persistants, zones tactiles confortables (44 px minimum).
- Animation courte et utile; respecter `prefers-reduced-motion`.
- Réutiliser les composants, tokens, helpers `cn` et conventions existants.
- Ne pas redessiner ni modifier les écrans Explorer/catégories. La hiérarchie catégories/sous-catégories existante est une source métier à préserver.

## 4. Architecture UX cible

Conserver toutes les capacités existantes. Réorganiser l'expérience en quatre grandes phases lisibles, sans supprimer les étapes métier ni leurs données :

### A. Présentation
- Couverture avec aperçu immédiat et remplacement simple.
- Titre, description.
- Catégorie principale puis sous-catégorie dépendante (hiérarchie actuelle inchangée).
- Capacité (si pertinente selon le mode choisi).

### B. Date et lieu
- Type de présence : présentiel / en ligne / hybride uniquement si le modèle et les services le prennent réellement en charge. Sinon ne pas exposer ces options.
- Pour le présentiel : pays → ville → quartier/adresse → nom du lieu.
- Recherche de lieu avec suggestions seulement si un fournisseur de géocodage/cartographie est déjà configuré ou validé.
- Carte avec marqueur déplaçable seulement si un vrai fournisseur et une clé/configuration sont disponibles.
- Saisie manuelle toujours possible.
- Géolocalisation de l'organisateur facultative, clairement distincte de la position du lieu.
- Début et fin, affichage explicite du fuseau horaire local et validation fin > début.
- Ne jamais enregistrer une coordonnée approximative comme coordonnée confirmée du lieu.

### C. Accès et billetterie
- Choix explicite du mode : billets GBAIGBANCE, gratuit, WhatsApp ou externe.
- Afficher uniquement les champs pertinents au mode choisi.
- Pour chaque billet : type autorisé, nom, prix XOF, quantité, description.
- Valider prix >= 0, quantité entière > 0, cohérence capacité globale / quotas.
- Ne pas confondre prix minimum affiché et prix réellement configuré.
- Vérifier les règles métier existantes avant de modifier le statut ou le comportement de publication.

### D. Équipe, contenu et publication
- Collaborateurs, programme, live et sponsors restent disponibles comme options métier.
- Aperçu fidèle à la fiche publiée.
- Résumé des champs requis et erreurs avec lien vers l'étape concernée.
- Publication explicite; ne pas promettre un brouillon persistant avant mise en place réelle.
- Confirmer le statut réellement retourné par le backend (ex. pending si collaborateurs à valider).

## 5. Règles métier et validation

- Titre requis.
- Début requis; fin facultative mais, si fournie, strictement après le début.
- Lieu et ville requis pour le présentiel selon les règles actuelles; adapter seulement après validation des règles pour les événements en ligne.
- Catégorie principale et sous-catégorie cohérentes; ne pas dupliquer les événements ni créer de taxonomie parallèle.
- Billetterie native : au moins un billet valide; prix numérique non négatif; quantité entière positive.
- Gratuit : prix minimum à zéro et comportement de ticket conforme au modèle actuel.
- WhatsApp : numéro requis.
- Externe : URL valide et normalisée.
- Capacité limitée : entière positive et cohérente avec les quotas; capacité illimitée ne doit pas être simulée par une valeur arbitraire.
- Erreurs accessibles, localisées FR/EN, conservant les saisies.
- Éviter les doubles soumissions; état de chargement et résultat serveur explicites.

## 6. Emplacement : modèle de données attendu

Réutiliser les colonnes existantes tant qu'elles couvrent le besoin :
- `country` : code pays déjà utilisé par le projet.
- `city` : ville.
- `location_name` : nom public du lieu.
- `location_address` : adresse lisible.
- `latitude` / `longitude` : coordonnées du lieu confirmées.

Ne pas ajouter de migration sans vérifier d'abord le schéma réel et les usages dans les écrans de détail, recherche, cartes et administration.

Ordre de saisie recommandé : pays → ville → recherche/saisie de lieu → adresse complémentaire → confirmation du point sur carte (si disponible). Garder une alternative sans carte. Le point GPS doit correspondre au lieu de l'événement, pas à la position du créateur.

## 7. Découpage de travail pour les agents

### Agent frontend
1. Auditer le wizard complet et les composants réutilisables avant modification.
2. Proposer une structure d'étapes claire qui conserve les neuf capacités existantes.
3. Construire les états conditionnels selon le type d'accès.
4. Améliorer la validation progressive, le résumé et la navigation entre erreurs.
5. Améliorer le sélecteur de lieu uniquement avec une intégration cartographique réellement disponible.
6. Assurer responsive, thème sombre, traductions FR/EN, accessibilité et performance.

### Agent backend / Supabase
1. Vérifier le schéma réel de `events`, `ticket_options`, collaborateurs, programme, live et sponsors.
2. Vérifier les politiques RLS et les règles de publication.
3. Étudier une création atomique ou une stratégie de compensation pour éviter les événements partiellement créés.
4. Étudier le brouillon persistant seulement après définition du modèle de statut et des politiques.
5. Confirmer les limites, types et contraintes des coordonnées, dates, prix et quantités.
6. Ne pas modifier le schéma de production sans migration documentée et validation.

### Agent design / UX
1. Produire une proposition mobile-first inspirée de la référence, sans la copier.
2. Maintenir l'identité violette GBAIGBANCE et les modes clair/sombre.
3. Prévoir états vide, erreur, chargement, sélection, aperçu et succès.
4. Tester les longs libellés, petits écrans et claviers mobiles.

### Agent QA
1. Tester les neuf capacités existantes et les quatre modes d'accès.
2. Tester changement pays/ville, coordonnées absentes, permission GPS refusée et lieu saisi manuellement.
3. Tester dates incohérentes, capacité/quantités, prix, URL externe et numéro WhatsApp.
4. Vérifier événements avec et sans collaborateurs et statut serveur.
5. Vérifier échec pendant upload et pendant sauvegardes secondaires.
6. Tester FR/EN, clair/sombre, clavier, lecteurs d'écran, responsive et réduction des animations.
7. Vérifier absence de régression dans Explorer, catégories, dashboard et billetterie.

## 8. Contraintes de collaboration et de livraison

- Branche d'écriture unique : `FRONTEND-iA`. Ne pas pousser sur `main`.
- Ne pas fusionner ni ouvrir de PR sans demande explicite.
- Préserver les changements existants et inspecter le diff avant toute modification.
- Ne pas toucher aux fichiers de mémoire d'un autre agent, notamment `PROJECT_MEMORY.md`.
- Fichier de référence : ce document. Toute décision nouvelle doit être ajoutée ici avec son statut (proposé / validé / implémenté).
- Pas de migration backend par défaut; demander une validation si le besoin dépasse le modèle existant.
- Ne pas modifier la page Explorer ni le design des cartes de catégories.
- Ne pas supprimer une fonctionnalité pour simplifier visuellement le wizard.

## 9. Définition de terminé

- Toutes les capacités métier actuelles sont conservées.
- L'organisateur comprend où il en est et ce qu'il lui reste à faire.
- Les erreurs sont prévenues ou expliquées sans perte de saisie.
- Le lieu enregistré correspond à une adresse et des coordonnées fiables, ou reste clairement sans coordonnées.
- Les billets, quantités, capacité et prix sont cohérents.
- Le statut affiché correspond au statut backend.
- Les langues FR/EN et les thèmes clair/sombre sont cohérents.
- Aucun bug TypeScript/lint/build introduit.
- Tests manuels et automatisés pertinents consignés.
- Aucune régression sur les autres surfaces de GBAIGBANCE.

## 10. État de ce document

- [x] Branche FRONTEND-iA identifiée.
- [x] Wizard, mutation de création et types inspectés.
- [x] Capacités existantes et limites initiales consignées.
- [x] Premier correctif GPS : aucune coordonnée de centre-ville préremplie; changement de ville/pays/lieu/adresse invalide les anciennes coordonnées; texte FR/EN précisant que la géolocalisation n'est exacte que si l'organisateur est sur le lieu.
- [x] Première validation métier : date de fin postérieure au début; capacité entière positive lorsqu'elle est limitée; prix de billet non négatif; quantité entière positive; somme des quantités inférieure ou égale à la capacité.
- [ ] Audit complet des composants, migrations et schéma Supabase.
- [ ] Audit complet de la cohérence des traductions et des états accessibles.
- [ ] Design final choisi et refonte visuelle.
- [ ] Tests de build, tests fonctionnels et QA visuelle.

### Journal d'avancement — 2026-11-20

Commits d'implémentation sur FRONTEND-iA :
- `01ef17ee774aefca1aca79cb86bfbd7c93b4dfd7` — coordonnées du lieu non préremplies et invalidation des coordonnées devenues obsolètes; validation initiale des dates et billets.
- `6f2286480caca7ac8267771dd9dffabba4428b82` — libellé GPS français clarifié.
- `a2ce2b718af0d041b2ceff60b150dcd8d491b49d` — libellé GPS anglais clarifié.
- `a6103fdbc2834e9c9518a24e51762f318293a96c` — aide contextuelle GPS FR/EN dans le formulaire.
- `74410c9030fd292054795e8463e89e86a1c012f3` — capacité requise lorsqu'elle est limitée.
- `cffeb53efa379b7e15890bad675e6769c5225c25` — validation de cohérence entre capacité et total des billets.

Le déploiement Vercel de prévisualisation est en cours au moment de cette mise à jour; aucune validation de build n'est encore revendiquée.
