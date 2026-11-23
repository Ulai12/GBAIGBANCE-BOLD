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


## 2026-11-23 — Réservation : garde de session Supabase (P1)
- Diagnostic vérifié sur le projet Supabase `lwwiolbofrqakvrdvbbj` : les fonctions `purchase_tickets_multi`, `initiate_ticket_payment`, `compute_ticket_fees` et `toggle_event_like` existent en production. `purchase_tickets_multi` a la signature attendue par le client et EXECUTE est accordé à `authenticated` (pas à `anon`). La migration `20261123132031_fix_toggle_event_like_and_likes_count` est appliquée; PostgREST a rechargé son cache et annonce 28 fonctions à 13:20:32 UTC.
- Correction du diagnostic précédent : l'absence de `toggle_event_like` dans la migration du 17 novembre ne signifie pas que la fonction manque en production; la migration distincte du 23 novembre l'a créée/corrigée. Le toast « réseau » des favoris n'a pas pu être reproduit; aucun log de requête utilisateur correspondant n'a été trouvé dans la fenêtre inspectée. Le repli frontend ajouté précédemment ne traite que le cas RPC explicitement absente, pas une panne réseau.
- Cause probable du message « fonction serveur manquante » sur la réservation : `AppContext` peut initialiser un profil local en cache pendant que la session Supabase est encore en cours de restauration. Le modal utilisait auparavant `user.id` sans vérifier la session. Or les RPC de réservation sont volontairement non exécutables par `anon`; un appel prématuré sans session peut être masqué comme RPC absente. Cette explication est cohérente avec le code et les permissions live, mais l'appel exact à l'origine de la capture n'a pas été journalisé/reproduit.
- Corrections sur `src/components/BookingModal.tsx` : attendre la résolution de session, vérifier que `session.user.id` correspond à `user.id`, bloquer le bouton pendant la résolution et afficher une erreur de reconnexion explicite.
- Correction sur `src/features/tickets/service.ts` : revérifier indépendamment la session Supabase et la correspondance du compte avant tout appel RPC gratuit ou payant.
- Commits : `4f892d0` (service), `4a4cd64` (modal). Branche `FRONTEND-iA` uniquement.
- Validation : fonctions, signature, privilèges et cache PostgREST contrôlés en lecture seule; le probe SQL de `purchase_tickets_multi` sans session renvoie correctement `Authentification requise` sans créer de billet. Preview Vercel pour `4a4cd64` encore QUEUED au dernier contrôle; build, test réel avec compte authentifié, persistance du billet et validation visuelle non encore effectués. Les logs disponibles ne contenaient pas de requête utilisateur correspondante.
- Prochaine priorité : attendre le build READY, puis tester sur la Preview avec un compte connecté : réservation gratuite, persistance après rechargement, puis initiation payante sans déclencher de paiement réel. Reprendre ensuite l'investigation du toast réseau des favoris sur un appareil/session réelle.


## 2026-11-23 — Favoris : synchronisation après restauration de session (P1)
- Cause probable identifiée dans `FavoritesContext` : le provider lançait la lecture Supabase et le canal Realtime dès qu'un `user.id` local était disponible, sans attendre que `AppContext` ait restauré le JWT. Le profil local en cache pouvait donc être pris pour une session active; les erreurs étaient ensuite toutes affichées comme « problème réseau ». Aucun log API utilisateur n'a permis de confirmer l'incident exact, donc la cause reste probable et doit être validée sur l'appareil de l'utilisateur.
- `src/contexts/FavoritesContext.tsx` : lecture des favoris et abonnement Realtime différés jusqu'à ce que `isSessionResolving` soit faux et que `session.user.id === user.id`; relance du cycle lorsque l'état d'auth change. Le toggle optimiste est bloqué pendant la restauration ou en cas de mismatch, avec un message de session clair.
- `src/features/events/interactions.ts` : vérifie une session Supabase active avant la RPC atomique `toggle_event_like`. Le fallback direct sur `event_likes` a été retiré après vérification de la RPC en production : il aurait pu contourner la mise à jour atomique de `likes_count`. La RPC vérifiée reste la source de vérité.
- Commits : `0b0325c` (contexte favoris), `c3938a2` (garde session), `7e4896b` (dépendances explicites), `e204439` (RPC atomique conservée). Branche `FRONTEND-iA`.
- Preview Vercel `dpl_C28mLtHWgFY1i8v88WU84Qge84nZ` pour `e204439` : READY. Build Vite + PWA terminé sans erreur. Pas de test de clic authentifié, de persistance, de test visuel mobile, de typecheck ni de lint exécuté. Le navigateur local n'était pas connecté à cette session.
- Prochaine étape : demander un test contrôlé sur Preview avec le compte réel : ajouter un favori, le retirer, recharger, puis vérifier l'onglet Favoris. Tester une réservation gratuite uniquement sur un événement de test afin de ne pas consommer le stock d'un événement réel. Ne pas déclencher de paiement réel pendant la validation.


## 2026-11-23 — Tendances et Studio de création (P2)
- Branche vérifiée : `FRONTEND-iA` uniquement. Mémoire lue intégralement avant intervention. Aucun changement sur Explorer par catégorie.
- Tendances : `src/components/TrendingDeck.tsx` limite la pile à la carte active et une carte suivante, mémoïse le filtrage des événements actifs et borne la pagination. `src/components/TrendingDeckCard.tsx` réduit les effets de flou, supprime le zoom animé permanent de l'image, charge l'image active en priorité et les suivantes en lazy, corrige les contraintes de swipe (anciennes contraintes de ±30 px incompatibles avec le seuil de 80 px) et désactive l'inertie.
- Studio : `src/screens/CreateEventWizardScreen.tsx` compacte le header, aligne Aperçu avec le titre, fusionne la progression en une barre segmentée accessible, réinitialise le scroll en haut à chaque étape, agrandit les champs date/heure et les cibles tactiles des suggestions. L'heure de début n'est plus préremplie visuellement lorsque la date est vide; le défaut 20:00 reste appliqué lors de la saisie d'une date.
- Recherche : web.dev et Chrome Modern Web Guidance recommandent `transform`/`opacity`, d'éviter les animations de layout/paint, de ne pas abuser de `will-change`, de respecter `prefers-reduced-motion` et de garder les carrousels contrôlables. Sources : https://web.dev/articles/animations-guide ; https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/motion.md.
- UIAudit/Superdesign non utilisés : aucun workflow/outillage correspondant n'a été exposé dans cette session. Aucun changement backend/API, migration ou dépendance.
- Accessibilité complémentaire : les boutons Favori et Réserver de la carte arrière sont désactivés tant que cette carte n'est pas active, afin d'éviter les contrôles focusables dans une zone `aria-hidden`. Commit `c5553fddc2c09f96d0554cea53d722e4966530f4`.
- Build Vite + génération PWA : Preview Vercel `dpl_8zEFCsvfu2qBTVHsJ3B5jUcE196E` READY pour `c5553fddc2c09f96d0554cea53d722e4966530f4`; Vite a transformé 3306 modules et terminé en 5,54 s. Le typecheck et le lint ne sont pas exécutés. QA visuelle mobile non exécutée : le navigateur connecté n'était pas accessible dans cette session. Tests swipe iPhone, clavier et revue des neuf étapes restent à faire.

## 2026-11-23 — Tendances : motion directionnel (P2)
- Amélioration sur `src/components/TrendingDeck.tsx` et `src/components/TrendingDeckCard.tsx` : transitions directionnelles selon navigation précédente/suivante, swipe gauche/droite cohérent, pile arrière orientée dans le sens du prochain geste, ressort plus contrôlé, indicateur de pagination animé via `transform` (scaleX) + opacity au lieu d'animer sa largeur.
- Les mouvements sont limités à `transform` et `opacity`; aucune animation de flou, d'ombre ou de layout n'est ajoutée. Aucun autoplay, aucune boucle décorative. Respect de `prefers-reduced-motion` (entrées/sorties spatiales retirées, fondu très court).
- Le swipe change désormais réellement d'élément dans le bon sens; seuils et vélocité sont modérés. La pile reste limitée à deux cartes et les contrôles de la carte arrière restent inactifs.
- Recherche : Chrome Modern Web Guidance (motion, 23 nov. 2026) et web.dev animations guide; références : https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/motion.md ; https://web.dev/articles/animations-guide ; Motion AnimatePresence : https://motion.dev/docs/react-animate-presence.
- Non vérifié : build/typecheck/lint, interaction tactile iPhone, rendu visuel et métriques de frame-time. Pas de capture visuelle disponible. Prochaine validation : build Preview puis test swipe dans les deux sens, pagination clavier et réduction du mouvement.


## 2026-11-23 — « À la une » : restauration visuelle et autoplay (P1)
- À la demande de l'utilisateur, restauration de la présentation antérieure de `FeaturedCarousel` : ratio mobile `16/10`, hauteur minimale `330px`, ombre simple, voile d'image et taille/couleur du prix d'origine. Le format portrait `4/5` et les bordures/ombres ajoutées ont été retirés.
- Optimisation du changement de slide : remplacement de l'intervalle permanent par un timeout unique de 6 s, réarmé après chaque changement de slide. Il est nettoyé à chaque effet et suspendu pendant le survol, le toucher/drag et lorsque le document est masqué.
- Le mode de présence est passé de `popLayout` à `sync` car le carrousel est déjà positionné en absolu dans un conteneur à dimensions fixes; cela évite le travail de mesure/insertion de layout inutile. Mouvement limité aux transforms/opacity, inertie de drag désactivée, seuil visuel conservé.
- L'autoplay n'est plus désactivé par `prefers-reduced-motion`; la préférence réduit plutôt la durée de transition à 0.01 s, afin de garder la fonction tout en respectant la réduction des animations.
- Commit : `4355550078511de9cb3769065a398e7e10435a3d` sur `FRONTEND-iA`.
- Aucun changement sur « Explorer par catégorie », les données, favoris, réservation, backend/API, dépendances ou lockfiles.
- Relecture distante après commit effectuée. Build Vite, typecheck, lint, Preview READY et mesure INP/frame-time non exécutés dans cette passe; test réel sur iPhone à faire. Ne pas déclarer la performance mesurée ou confirmée sans profilage.


## 2026-11-23 — « À la une » : switch non bloquant et préchargement léger
- Retour utilisateur : le switch devait être beaucoup plus rapide ; le chargement des images ne doit pas bloquer le changement de slide.
- `FeaturedCarousel.tsx` : transitions du contenu ramenées à 120 ms (0.01 s si réduction des animations), sans translation horizontale longue. Le changement d'index ne dépend d'aucune promesse réseau/décodage.
- Préchargement en arrière-plan des couvertures immédiatement précédente et suivante via `Image`, `srcset` responsive construit avec `buildResponsiveImageSources`, `decoding=async` et `fetchPriority=low`. Le cache navigateur peut réutiliser la ressource au switch. Le préchargement est suspendu quand le document est masqué et tient compte du mode économiseur de données ; il ne précharge pas toute la liste.
- Le layout historique restauré (16:10 mobile) reste inchangé.
- Commit : `5c7d33de5d334d45cbf882c0601c89a53176793d` sur `FRONTEND-iA`.
- Vérification statique distante : switch non bloquant, priorité basse, durée courte, responsive/data saver et ratio historique présents. Build/typecheck/lint, mesures INP et QA iPhone non encore exécutés.


## 2026-11-23 — Préchargement partagé et switch horizontal des cartes
- Création de `src/utils/preloadResponsiveImages.ts` : utilitaire partagé de préchargement responsive limité, dédupliqué, asynchrone et à priorité basse. Il tient compte du mode économiseur de données, utilise les variantes responsive et n'expose aucune promesse à attendre côté interaction.
- `src/components/FeaturedCarousel.tsx` : « À la une » adopte un remplacement horizontal directionnel : au suivant, la carte courante sort à gauche et la suivante entre depuis la droite ; navigation précédente inversée. Une seule carte occupe la scène, sans pile, sans effet de profondeur et sans attente réseau. Durée courte (220 ms), quasi instantanée avec réduction des animations. Ratio et apparence restaurés précédemment conservés.
- `src/components/TrendingDeck.tsx` : filtrage mémoïsé et préchargement basse priorité des couvertures immédiatement précédente/suivante via le même utilitaire. `TrendingDeckCard.tsx` donne priorité haute à l'image active et lazy/basse priorité à la carte arrière ; le style de pile existant de Tendances est conservé.
- Les grilles et listes ordinaires continuent d'utiliser le chargement lazy de `SmartImage` : pas de préchargement global de toutes les images, afin de ne pas consommer inutilement le réseau et la mémoire. Le nouvel utilitaire est réutilisable dans les autres flux à navigation séquentielle (rails, galeries, carrousels).
- Aucun changement dans « Explorer par catégorie », backend/API, données métier, dépendances ou lockfiles.
- Commits successifs sur `FRONTEND-iA` : `a6ab1efe` (utilitaire), `1ea7dd13` (À la une), `8846adbf` (Tendances), `aaf1c131` (priorité image active).
- Validation restante : build Vercel, typecheck/lint, QA tactile iPhone, vérification visuelle du sens du glissement et mesure INP/frame-time. Aucune de ces validations n'est déclarée réussie à ce stade.


## 2026-11-23 — Ajustement 3D de la carte « À la une »
- Clarification utilisateur : le déplacement doit concerner la carte entière (image, conteneur, contenu, contrôles et ombre), pas uniquement les éléments internes ; référence esthétique = carte 3D de « Tendances », sans pile de cartes.
- `FeaturedCarousel.tsx` : la carte complète reste dans un unique `motion.div` qui porte l'image et tous les éléments. Ajout d'une scène avec perspective 3D, rotation Y subtile, réduction d'échelle légère et ombre portée pendant le remplacement horizontal. La carte sort entièrement du cadre, la suivante entre depuis l'autre côté ; pas de seconde carte empilée. Conteneur de scène ne découpe plus le mouvement ; la carte garde ses propres coins arrondis et son overflow.
- Durée 320 ms, mouvement directionnel avec ressort/easing court ; chargement d'image toujours indépendant du switch. Respect du réglage de réduction des animations.
- Commit : `9a7fe9d8` sur `FRONTEND-iA`.
- Validation restante : build et contrôle visuel mobile ; vérifier que la perspective et les ombres ne sont pas rognées dans Safari iOS.


## 2026-11-23 — « À la une » : suppression du cadre parasite et motion premium
- Retour utilisateur : contour de la carte jugé laid et présence d'un aplat violet derrière la carte.
- `src/components/FeaturedCarousel.tsx` : suppression du contour blanc de la carte, du dégradé violet de fond indépendant et de la perspective/rotation Y qui donnaient un aspect artificiellement encadré.
- La scène de slide découpe désormais le mouvement à ses limites avec des coins arrondis. La carte reste un seul bloc : image, contenu, badges, actions et ombre voyagent ensemble.
- Transition directionnelle affinée : translation horizontale complète, légère variation d'échelle (0,985 → 1) et fondu discret. Courbe remplacée par un ressort contrôlé (stiffness 280, damping 32, mass 0,9), sans rotation 3D forcée. Le mouvement est court, continu et cohérent avec le geste ; `prefers-reduced-motion` conserve un changement quasi instantané.
- Référence de conception : Apple Human Interface Guidelines — Motion (mouvement utile, bref, précis, facultatif et non bloquant) : https://developer.apple.com/design/human-interface-guidelines/motion ; WWDC23 Explore SwiftUI animation (ressorts Smooth/Snappy) : https://developer.apple.com/videos/play/wwdc2023/10156/.
- Commit : `49a7d4f7d92b45c5f58d577a8156333a845d9e91` sur `FRONTEND-iA`.
- Validation : changement appliqué via GitHub et commit enregistré. Build du nouveau commit, QA visuelle iPhone/Safari et vérification du rendu final encore à effectuer. Le précédent déploiement READY correspondait à l'ancien commit `e7f682f`, pas à cette correction.
