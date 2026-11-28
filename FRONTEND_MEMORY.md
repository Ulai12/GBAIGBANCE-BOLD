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


## 2026-11-23 — « À la une » : sortie réelle hors du viewport mobile
- Retour utilisateur : le slide était encore coupé par le cadre de la carte ; on voyait la carte disparaître à la limite de son petit conteneur au lieu de quitter l'écran.
- `src/components/FeaturedCarousel.tsx` : le wrapper du carrousel devient une fenêtre de clipping pleine largeur (`w-screen max-w-[100vw] overflow-x-clip`) centrée par rapport à la section ; la scène intérieure garde ses marges visuelles de 20 px mais passe en `overflow-visible` et ne rogne plus la translation.
- Les positions d'entrée/sortie sont désormais calculées à l'échelle du viewport (`±110vw`) : la carte complète (image, conteneur arrondi, contenu, badges, boutons et ombre) traverse le téléphone et disparaît au-delà du bord de l'écran. Le déplacement horizontal, le sens avant/arrière, le swipe et le respect de `prefers-reduced-motion` sont conservés. Aucun changement dans « Explorer par catégorie ».
- Référence technique : le clipping doit être porté par le viewport plein écran et non par le petit cadre interne ; `overflow: hidden` sur un parent coupe les transformations de ses descendants. Références : CSS Overflow Module Level 3 et Apple HIG Motion (mouvement bref, précis et cohérent avec le geste).
- Commit code : 1ce95e80451ceffbc099a66e0abe86e1f0a25122 sur `FRONTEND-iA`.
- Validation restante : build/typecheck/lint, déploiement preview et QA tactile sur Safari iPhone ; ces validations ne sont pas encore déclarées réussies.

## 2026-11-23 — Retour au mouvement initial 3D de « À la une »
- À la demande de l'utilisateur, la base visuelle et le comportement reviennent au commit `9a7fe9d8d6be12646b85531e6cc8e0f12be1e0d5` : une seule `motion.div` porte toute la carte et son contenu, avec glissement horizontal, inclinaison 3D discrète, swipe et direction avant/arrière.
- Retouches demandées appliquées sans ajouter de nouveau conteneur : suppression du wash violet derrière la carte, suppression du contour blanc et remplacement du fond dégradé violet de secours par un fond neutre sombre. L'ombre reste attachée à la carte.
- Le wrapper extérieur reste `relative w-full` sans `overflow-hidden` ; la scène intérieure ne coupe pas le mouvement. La translation ±108% permet à la carte entière de quitter la zone du carrousel et de passer au-delà des bords visibles du téléphone, sans viewport artificiel plein écran.
- Aucun changement dans `HomeScreen` ni dans « Explorer par catégorie ».
- Commit code : d6b75dc14e93efa4e86250854808098925503a8b sur `FRONTEND-iA`.
- Validation : code source restauré depuis le commit de référence puis retouché de façon ciblée ; QA visuelle iPhone/Safari et test du build restent à effectuer.

## 2026-11-24 — Localisation Metrics Chart et Refunds Tab (P2)
- Tâche poursuivie : localisation progressive du tableau de bord organisateur.
- Objectif : rendre bilingues (FR/EN) les composants enfants clés du dashboard — graphiques de performances et onglet remboursements — pour une expérience cohérente selon la langue active.
- Ajout des clés `metrics.*` et `refunds.*` dans `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`.
- `OrganizerMetricsChart.tsx` : import de `useApp`, remplacement de tous les libellés hardcodés (titre, KPIs, périodes, tooltips, états vide/chargement/erreur, hints) par `t('organizer', 'metrics.xxx')` avec `.replace` pour les interpolations `{count}` / `{price}`.
- `OrganizerRefundsTab.tsx` : même approche pour titres, boutons, toasts, modal de refus, états loading/empty.
- Aucun changement de logique métier, backend, styles ou « Explorer par catégorie ».
- Commits : e1d0a3e (FR JSON), 6f494d9 (EN JSON), 68075fc (Metrics), 3c8a0d8 (Refunds) sur FRONTEND-iA.
- Vérification distante : fichiers relus, tailles augmentées (Metrics ~17.8ko → 18.3ko, Refunds ~11.0ko → 11.3ko), contenu réel avec `t()` présent, pas de troncature.
- Non vérifié : build/typecheck/lint, switch de langue en runtime, rendu visuel mobile.
- Prochaine étape : localiser TicketScannerModal et EventManagementModal par petits commits, ou harmoniser les états loading/empty restants.

## Tâche active
Localisation des composants enfants du OrganizerDashboard (suite).

## 2026-11-24 — Localisation EventManagementModal (P2)
- Tâche poursuivie : localisation progressive du tableau de bord organisateur.
- Objectif : rendre bilingue (FR/EN) le modal de gestion d'événement (programme, live, sponsors, cycle de vie).
- Ajout des clés `manage.*` dans `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`.
- `EventManagementModal.tsx` : import de `useApp`, remplacement de tous les libellés hardcodés (titre modal, boutons cycle, onglets, formulaires, toasts, tiers sponsors, placeholders) par `t('organizer', 'manage.xxx')` avec `.replace` pour `{title}`.
- TIERS déplacé dans le composant pour utiliser les traductions.
- Aucun changement de logique métier, backend, styles ou « Explorer par catégorie ».
- Commits : c774f08 (FR JSON), 93ae4ae (EN JSON), 49a7cf6 (TSX) sur FRONTEND-iA.
- Vérification distante : fichier relu, taille augmentée (~18.4ko → 19.9ko), contenu avec `t()` présent, pas de troncature.
- Non vérifié : build/typecheck/lint, switch de langue en runtime, rendu visuel mobile.
- Prochaine étape : localiser TicketScannerModal par petits commits.

## Tâche active
Localisation des composants enfants du OrganizerDashboard (suite) — TicketScannerModal.


## 2026-11-24 — Localisation complète du scanner de billets (P2)
- Poursuite du chantier documenté : TicketScannerModal, après Metrics, Refunds et EventManagementModal.
- `src/components/TicketScannerModal.tsx` : textes visibles, états réseau, actions, titres, aides, erreurs caméra, toasts, saisie manuelle et historique localisés via le domaine `organizer`. Les boutons à icône reçoivent des `aria-label`; le sélecteur d'événement et les champs de saisie/recherche sont nommés pour les technologies d'assistance.
- Les heures d'historique suivent la langue active FR/EN. Les anciens enregistrements avec valeurs de secours françaises (« Participant », « Participant vérifié ») sont affichés dans la langue courante.
- `src/services/ticketScannerService.ts` : ajout d'un `messageKey` typé aux 14 issues de validation (en ligne/hors ligne, billet valide, déjà utilisé, annulé, mauvais événement, QR illisible/inconnu). La logique de validation, les appels RPC, le cache et la synchronisation restent inchangés. Les noms de secours sont gérés par l'interface.
- Ajout des traductions FR/EN `scannerModal.*` dans `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`.
- Aucun changement backend/API, schéma Supabase, dépendance, lockfile ou « Explorer par catégorie ».
- UIAudit/Superdesign : workflows non exposés dans les outils disponibles; aucun audit ou draft non effectué n'est revendiqué.
- Vérifications statiques : JSON parsable, clés FR/EN identiques, 14 messageKey couvertes par les deux langues, aucune chaîne visible française restante dans le composant.
- Non vérifié à ce stade : build/typecheck/lint, rendu visuel, test caméra réel, saisie manuelle, import photo, états réseau et changement de langue sur mobile.
- Prochaine priorité : build Preview puis QA du scanner sur mobile (caméra, saisie, photo, online/offline, historique et bascule FR/EN).


## 2026-11-24 — Correction JSX du scanner après premier build Preview
- Le premier build Vercel du commit `5d76a51` a échoué à `TicketScannerModal.tsx:490` : neuf remplacements de libellés avaient omis le séparateur `>` entre les attributs JSX et l'expression traduite.
- Les neuf balises concernées sont corrigées; vérification statique : 9 cas repérés avant correction, 0 après. Aucun changement de logique de scan ou de réservation.
- Le build doit être relancé sur le commit correctif avant de déclarer la localisation validée.


## 2026-11-24 — Validation du scanner après correction JSX
- Preview Vercel `dpl_62dg4AumVCP5gJMFDGk2eM1CXgqX` pour le commit code `16b59a30e0e5180aa8a8ede424af4d8cb091706d` : état `READY`.
- Build Vite terminé en 4,85 s; génération PWA terminée et 14 fichiers statiques de Preview synchronisés. Statut GitHub Vercel : `success`.
- Le premier build du commit précédent avait échoué sur neuf balises JSX; les séparateurs manquants ont été corrigés avant le build READY.
- `npm run typecheck` et `npm run lint` non exécutés : le clone local a échoué car l'environnement ne résout pas `github.com`; aucun contournement ni modification de lockfile.
- QA visuelle/tactile non effectuée : le navigateur connecté n'a pas fourni de contexte de navigation accessible. Ne pas confondre build READY avec test réel de caméra ou validation mobile.
- Le commit code testé reste `16b59a3`; ce complément de mémoire sera un commit documentaire séparé.
- Prochaine priorité : test mobile avec les deux langues, caméra autorisée/refusée, validation online/offline, saisie manuelle, import photo et historique; exécuter typecheck/lint depuis un environnement de développement connecté.


## 2026-11-25 — Polish responsive et accessibilité de l'écran Billets (P2)
- Tâche : amélioration significative et visible du wallet billets sur mobile (cibles tactiles, focus, dark mode).
- Objectif : les onglets et le bouton « Réclamer » respectent ≥44px, meilleur contraste dark, focus visible pour clavier.
- Modifications sur `src/screens/TicketsScreen.tsx` :
  - Bouton claim : min-h-[44px], focus-visible ring.
  - Segmented control : conteneur min-h-[48px], fond dark zinc-800/80, chaque onglet min-h-[44px] + py-2.5 + focus-visible.
  - Conteneur liste : classe gba-tickets-content + key={activeTab} pour futur transition.
- Commit : 912c3569fef3e1c541aced7587868dbf3168ba19 sur FRONTEND-iA.
- Incident : premier essai via connecteur a écrit « PLACEHOLDER_TO_BE_REPLACED » (26 octets). Restauration immédiate via gh api avec le contenu complet local (19837 octets). Fichier distant relu et confirmé complet avec les modifications.
- Vérifications : relecture distante OK, taille avant ~19.4 ko → après 19.8 ko (augmentation voulue). Pas de build/typecheck/lint/rendu navigateur cette session (non vérifié).
- Prochaine étape : ajouter une transition CSS légère sur .gba-tickets-content (opacity) respectant prefers-reduced-motion, ou polish WalletPosterTicket.

## Incidents
- 2026-11-25 : troncature accidentelle TicketsScreen.tsx via connecteur (placeholder). Restauré immédiatement via API gh. Cause : content argument mal formé dans l'appel outil.

## Backlog mis à jour
P2 : transition d'onglets billets, polish cartes wallet.


## 2026-11-25 — P0 : restauration de l'application après troncature du split App
- Diagnostic : `src/AppContent.tsx` distant était tronqué à 20 593 octets et se terminait par un ancien arbre de routes simplifié. Plusieurs parcours Home/Profile/notifications et les props de navigation avaient disparu ou n'étaient plus transmis. `src/App.tsx` était bien un shell léger, mais l'ordre des providers différait de l'ordre historique.
- L'utilisateur confirme vouloir conserver la séparation App/AppContent et les améliorations scroll/swipe.
- Restauration de `src/AppContent.tsx` depuis la version complète vérifiée du commit `55b537a98787df461e4254820a20ecb283a5a603` (blob `20f26c79b68da233b0dcd9322b167512bdf8c662`), puis réintégration du hook `unlockDocumentScroll` et de sa restauration double requestAnimationFrame depuis la version récente. Le composant est exporté nommé pour le shell.
- La route Home transmet à nouveau `onOpenSettings={() => setSettingsModalOpen(true)}`; les routes d'authentification, détails, notifications, paramètres, abonnements, dashboard organisateur et création sont restaurées. Les modales Booking, AI Assistant et Settings, toasts, realtime tickets et EdgeSwipeBack sont présents.
- `src/App.tsx` reste un shell séparé, rétablit l'ordre historique `AppProvider > FavoritesProvider > DataSaverProvider`, conserve le mode GlassSpike et enveloppe AppContent dans Suspense/ErrorBoundary/BrowserRouter.
- Les fichiers ont été écrits uniquement sur `FRONTEND-iA`. Relecture distante effectuée : AppContent 29 471 caractères, App 1 287 caractères; pas de placeholder ni `return null`; Settings Home présent; routes et composants globaux présents.
- Commits : `f42734a64f44663f14ad06ba26a58ec6e2d3136e` (AppContent), `718b089c1c69171e98884d009feb3992c9b0e2b9` (App shell). Aucun PR, aucun changement sur main, aucun backend/API ou dépendance.
- Preview Vercel `dpl_Cp9ngx4MPWVkPXEmGf21W4Qd5QzG` pour `718b089c` : QUEUED au dernier contrôle; build non encore confirmé. Typecheck/lint et QA visuelle mobile non exécutés.
- Aucun changement sur « Explorer par catégorie ». Les corrections TrendingDeck/FeaturedCarousel existantes sont conservées.
- Prochaine priorité : attendre le build Preview; corriger les erreurs de compilation éventuelles, puis tester navigation Home, bouton Paramètres, Profile, notifications, authentification, détail événement, réservation, retour/scroll et swipes rapides sur mobile.


## 2026-11-25 — Navigation d'authentification et conservation de l'intention (P1)
- Amélioration ciblée du flux de navigation Login/Signup/Forgot Password.
- Le passage Connexion ↔ Inscription conserve désormais le `location.state`, donc le `returnTo` et une réservation en attente ne sont plus perdus lorsqu'un utilisateur change de formulaire.
- L'ouverture de Mot de passe oublié conserve également cet état; le retour navigateur retrouve le formulaire de connexion avec le contexte initial.
- Séparation du parcours « Continuer en invité » : ce bouton revient à la destination demandée sans appeler le callback de succès d'authentification. Cela évite de traiter un invité comme un utilisateur authentifié et de rouvrir par erreur une réservation protégée.
- Fichiers : `src/AppContent.tsx`, `src/screens/AuthScreen.tsx`.
- Aucun changement backend/API, dépendance, lockfile ou « Explorer par catégorie ».
- Validation statique des ancres et des callbacks effectuée avant écriture. Build, typecheck, lint et tests navigateur/mobile restent à exécuter.


## 2026-11-25 — Guards d'accès créateur et navigation de retour (P1)
- Ajout de `CreatorAccessRoute` : attend la fin de restauration de session Supabase, exige une session active et un rôle autorisé par `canManageEvents` avant d'afficher les espaces de création, le dashboard organisateur ou l'édition d'événement. Les politiques RLS restent l'autorité pour les opérations de données et la propriété des événements.
- Les accès directs à `/create`, `/organizer/dashboard` et `/events/:id/edit` redirigent les visiteurs non connectés vers Connexion avec un `returnTo` interne; les comptes sans rôle créateur voient une porte d'accès avec retour adapté.
- Ajout de `getSafeInternalPath` pour n'accepter que des chemins internes (pas d'URL externe, de protocole relatif ou de boucle vers les écrans d'authentification). Les retours après connexion/inscription et OTP utilisent cette validation.
- Correction de la conservation de `location.state` depuis Inscription vers Mot de passe oublié. Le bouton Créer de la navigation basse transmet désormais `returnTo: /create`.
- Harmonisation du retour arrière : `AppContent`, les wrappers de routes et le swipe de bord utilisent `safeNavigateBack`. Le retour ne se fie plus au referrer navigateur comme preuve d'une entrée SPA; sans index React Router valide, il applique un fallback interne déterministe.
- Fichiers : `src/navigation/CreatorAccessRoute.tsx`, `src/utils/navigation.ts`, `src/AppContent.tsx`, `src/navigation/RouteWrappers.tsx`, `FRONTEND_MEMORY.md`.
- Aucun changement backend/API, schéma Supabase, dépendance, lockfile ou « Explorer par catégorie ».
- Nettoyage post-relecture : retrait de l'import `UnauthorizedCreateGate` devenu inutilisé dans `AppContent` après centralisation des guards; build, typecheck, lint, tests de routes et QA navigateur/mobile restent à exécuter.


## 2026-11-25 — Supabase : durcissement RLS créateurs et RPC authentifiées (P1)
- Audit en lecture de la base Supabase active `lwwiolbofrqakvrdvbbj` : RLS était activé sur les 27 tables publiques recensées, mais plusieurs politiques et ACL restaient trop permissives.
- Migration live appliquée et versionnée : `20261125120841_harden_rls_creator_and_auth_rpc_access`.
- Ajout de triggers `SECURITY DEFINER` à `profiles`, `organizations` et `artists` : un utilisateur ne peut plus s'attribuer le rôle `admin`, se déclarer vérifié, ni falsifier directement les compteurs de followers/événements. Les rôles non-admin choisis par l'utilisateur restent possibles pour préserver le parcours d'inscription.
- Les politiques INSERT/DELETE de `event_artists` sont maintenant limitées au propriétaire de l'événement, à un collaborateur accepté ou à un administrateur; la lecture publique est conservée.
- Correction d'un défaut ACL : révoquer EXECUTE uniquement à `anon` ne suffisait pas, car `PUBLIC` accordait encore l'exécution. `accept_collaboration`, `book_ticket`, `cancel_ticket` et `submit_event_report` sont désormais explicitement interdits à `PUBLIC`/anon et autorisés à `authenticated` + `service_role`.
- Vérifications live après migration : les 3 triggers sont présents; les 2 politiques `event_artists` portent les conditions attendues; les 4 RPC refusent EXECUTE à anon et PUBLIC tout en conservant authenticated/service_role. L'advisor Supabase ne signale plus ces 4 RPC parmi les fonctions SECURITY DEFINER exécutables par anon.
- Le projet comptait 0 profil `admin` au moment de l'audit; aucun compte administrateur n'a été créé ni promu automatiquement.
- Risques restant à traiter dans une passe séparée, après adaptation et validation du frontend : les politiques directes INSERT/UPDATE/DELETE de `tickets` permettent encore des mutations hors RPC; la table `profiles` expose encore une lecture publique incluant des colonnes personnelles. Préparer d'abord les usages frontend et une vue publique sans PII avant de resserrer ces accès.
- Aucun changement sur `main`, dépendances, lockfiles ou « Explorer par catégorie ». Branche de code ciblée : `FRONTEND-iA`.


## 2026-11-25 — Synchronisation de session et protection contre les profils obsolètes (P1)
- Diagnostic sur src/contexts/AppContext.tsx : lors d'un changement de compte, l'ancien profil pouvait rester en mémoire pendant le chargement du nouveau; deux lectures de profils concurrentes pouvaient aussi se terminer dans le mauvais ordre. Une réponse tardive pouvait donc réinjecter le rôle du compte précédent après un changement de session ou une déconnexion.
- AppProvider : le changement d'identité efface immédiatement le profil précédent et active isSessionResolving; les chargements sont identifiés, dédupliqués par utilisateur et ignorés s'ils ne correspondent plus au compte courant. Les lectures en cours sont invalidées à la déconnexion et à l'absence de session. refreshProfile vérifie aussi l'identité avant d'appliquer sa réponse.
- CreatorAccessRoute : vérifie explicitement que user.id === session.user.id avant d'autoriser l'espace créateur; les données de profil d'un autre compte ne peuvent plus ouvrir cette route.
- Fichiers : src/contexts/AppContext.tsx, src/navigation/CreatorAccessRoute.tsx, FRONTEND_MEMORY.md.
- Aucun changement backend/API, schéma Supabase, dépendance, lockfile, données métier ou « Explorer par catégorie ». UIAudit/Superdesign non disponibles dans les outils exposés.
- Vérification statique : garde d'identité, invalidation des requêtes obsolètes et chemins de déconnexion présents; aucune modification des écrans de catégories. Preview Vercel READY pour le commit 0e7d2f3a12f8e4d92fe8b616a4c2a0ef1a3f973d (dpl_Bs37TqW6UgtKgMAakhuV5gBfFFcM); build Vite réussi, 3335 modules transformés, génération PWA et synchronisation des 14 fichiers de preview réussies; statut Vercel success. Le déploiement de la tête actuelle de FRONTEND-iA (9798bdf9acbf66a2075ba97c8f7072b6ad199078) est également READY. Typecheck, lint, tests automatisés et QA mobile multi-comptes non exécutés. Clone local impossible dans cette session (résolution DNS de github.com indisponible); aucune dépendance ni lockfile modifié.
- Prochaine priorité : valider sur Preview un passage compte créateur → compte participant, le sens inverse, une déconnexion pendant le chargement et l'accès direct aux routes /create, /organizer/dashboard et /events/:id/edit.


## 2026-11-25 — Billets : annulation transactionnelle et visibilité des participants (P1)
- Deuxième migration live appliquée et versionnée : `20261125121023_secure_ticket_mutations_and_attendee_access`.
- La RPC `cancel_ticket` accepte les statuts réels `active` et `valid`, vérifie le propriétaire du billet, verrouille la ligne, annule transactionnellement le billet, libère la quantité correspondante dans l'option et ajuste le compteur de participants.
- `src/features/tickets/service.ts` ne modifie plus directement la table `tickets` pour annuler. Il appelle la RPC, vérifie le retour serveur et ne retire le billet du cache local qu'après confirmation; les erreurs sont maintenant remontées au lieu d'être masquées.
- Ajout de la politique `tickets_select_secure` : détenteur, organisateur de l'événement, collaborateur accepté ou administrateur. Cela permet aux métriques organisateur de lire les billets de leurs événements tout en conservant la lecture personnelle des participants.
- `get_event_attendees` n'expose plus la liste des participants d'un événement privé/pending à n'importe quel compte connecté; les événements publiés restent consultables pour préserver la découverte sociale. Les billets en attente de paiement sont exclus du décompte des participants.
- Vérifications build et tests fonctionnels à exécuter sur Preview avant de supprimer les anciennes politiques directes INSERT/UPDATE/DELETE de `tickets`. Elles restent temporairement en place pour éviter de casser une version frontend encore non déployée.


## 2026-11-25 — Billets : verrouillage des mutations directes (P0)
- Troisième migration live appliquée et versionnée : `20261125121213_lockdown_direct_ticket_table_mutations`.
- Suppression des politiques RLS directes INSERT/UPDATE/DELETE et de l'ancienne policy SELECT personnelle de `tickets`; la policy `tickets_select_secure` est désormais la seule politique SELECT.
- Révocation de tous les privilèges directs sur `tickets` pour `PUBLIC`, `anon` et `authenticated`, puis rétablissement de SELECT uniquement pour `authenticated`. Les rôles clients n'ont plus INSERT, UPDATE, DELETE ni TRUNCATE; les écritures passent par les RPC SECURITY DEFINER contrôlées.
- Vérification SQL live : anon n'a aucun privilège sur tickets; authenticated conserve SELECT mais aucun droit INSERT/UPDATE/DELETE/TRUNCATE. La seule policy active sur tickets est `tickets_select_secure`.
- Preview Vercel READY pour le commit frontend `e60ee70432e3ddf6cb1f9ee434737ddfa9f9f1a3`; build réussi. Le code d'annulation utilise maintenant la RPC et ne modifie plus directement la table. Pas de test d'annulation avec billet réel ni de QA iPhone effectués.


## 2026-11-25 — Profils publics : vue sans données personnelles (P1)
- Migration live appliquée et versionnée : `20261125121350_create_safe_public_profiles_view`.
- Création de `public.public_profiles`, projection publique des champs de présentation (id, nom, avatar/couverture, rôle, ville/pays, bio, genres et dates), sans email ni téléphone. La vue expose un booléen `is_demo` calculé en base pour conserver le filtrage des comptes de test sans révéler leur adresse.
- Lectures publiques basculées vers cette vue dans les services utilisateurs, artistes, organisateurs, favoris, abonnements, interactions, collaborateurs, participants et notifications.
- `fetchProfileById` utilise désormais la vue publique et retourne explicitement `email: null`, `phone: null` et `gemini_config: null`.
- `isRealProfile` reconnaît le booléen `is_demo`; les sélections publiques nécessaires le récupèrent. Les lectures privées de son propre profil dans `src/services/auth.ts` et dans l'assistant IA restent sur `profiles`.
- Transition en deux temps : la policy publique sur `profiles` reste active pour l'instant. La migration finale sera appliquée seulement après Preview READY; elle supprimera cette policy et limitera l'accès direct à la ligne personnelle/admin.
- Build et QA profil/favoris/abonnements restent à confirmer.


## 2026-11-25 — Profils : fermeture de la lecture directe des données personnelles (P1)
- Migration live appliquée et versionnée : `20261125121719_lockdown_private_profile_reads`, après Preview READY du code utilisant `public_profiles`.
- Suppression de `profiles_select_public`; la table `profiles` ne peut être lue directement que par son propriétaire ou un administrateur via `is_platform_admin()`.
- Révocation de SELECT sur `profiles` pour `PUBLIC` et `anon`; les visiteurs gardent uniquement l'accès à `public_profiles`, qui ne contient ni email ni téléphone.
- Vérification live : `anon_profiles_select=false`, `anon_public_view_select=true`, `authenticated_profiles_select=true` avec policy owner/admin. La vue expose uniquement les colonnes prévues. La table profiles contenait 0 ligne au moment du contrôle; le rendu avec des profils réels reste donc à tester dès que des comptes de test existent.
- Les lectures personnelles via `src/services/auth.ts` et l'assistant IA restent autorisées par la policy propriétaire.

## 2026-11-25 — Paiements : confirmation réservée au webhook signé (P0)
- Migration live appliquée et versionnée : `20261125121822_restrict_payment_confirmation_to_signed_webhook`.
- Découverte : `confirm_ticket_payment` était exécutable par `authenticated` et ne vérifiait pas l'identité du service appelant; un compte connecté pouvait tenter de confirmer un paiement en attente sans preuve PSP et déclencher l'émission de billets.
- L'Edge Function `payment-webhook` est le seul appelant applicatif observé; elle vérifie `x-gba-signature` avec `PAYMENT_WEBHOOK_SECRET` puis utilise `SUPABASE_SERVICE_ROLE_KEY`.
- La RPC contient désormais une vérification défensive du claim JWT `role=service_role`; EXECUTE est révoqué à `PUBLIC`, `anon` et `authenticated`, et accordé uniquement à `service_role`.
- Vérification SQL live : anon=false, authenticated=false, service_role=true; la garde service_role est présente dans la définition active.
- Aucun paiement ni billet réel n'a été modifié pendant cette intervention.


## 2026-11-25 — Profils publics : projection synchronisée protégée par RLS (P1)
- La première implémentation `public_profiles` sous forme de vue a été rejetée après contrôle : l'advisor Supabase signalait `security_definer_view` en ERROR. Elle a été remplacée immédiatement par une table de projection publique, sans PII, protégée par RLS.
- Migration live : `20261125122000_replace_public_profiles_view_with_rls_table`.
- `public_profiles` est maintenant une table avec RLS activé et forcé; SELECT est le seul privilège accordé à `anon` et `authenticated`, sans INSERT/UPDATE/DELETE. Un trigger `SECURITY DEFINER` non exécutable par les clients synchronise les champs publics depuis `profiles` à chaque INSERT/UPDATE/DELETE.
- Le backfill initial a été exécuté. La table `profiles` ne contenait aucune ligne au moment du contrôle, donc le trigger n'a pas encore pu être validé sur un compte réel.
- Recontrôle Supabase : l'alerte ERROR `security_definer_view` a disparu; les seules fonctions SECURITY DEFINER encore accessibles à anon sont `get_platform_stats`, `increment_event_views` et `record_event_view`, conservées publiques pour les statistiques/compteurs d'événements. L'avertissement `pg_net` dans le schéma public reste non traité.


## 2026-11-25 — Statistiques plateforme : authentification admin et compteur de vues dédupliqué (P0)
- Migration live appliquée et versionnée sur `FRONTEND-iA` : `20261125122522_restrict_platform_stats_and_profile_writes`.
- `get_platform_stats()` n'est plus exécutable par `PUBLIC`, `anon` ou `authenticated`; seul `service_role` peut l'appeler. L'Edge Function reste le seul chemin frontend vers ces agrégats.
- Découverte critique : l'Edge Function `platform-stats` était déployée avec `verify_jwt=false` et ne contrôlait pas le rôle; la clé service_role lui permettait donc de renvoyer des statistiques privées à tout appelant. Le handler vérifie désormais le Bearer JWT auprès de Supabase Auth, lit le rôle du profil depuis la base avec le client serveur et renvoie 403 si le rôle n'est pas `admin`. `supabase/config.toml` fixe explicitement `verify_jwt=true`.
- `increment_event_views(uuid)` est retirée des privilèges client; seul `service_role` peut encore l'appeler. Les deux usages frontend non dédupliqués (télémétrie générale et fallback de l'interaction événement) sont supprimés. Le seul compteur client restant est `record_event_view`, qui limite l'enregistrement à un événement publié/non démo et déduplique par visiteur/jour.
- Les privilèges directs de `profiles` sont nettoyés : aucun INSERT/UPDATE/DELETE pour `PUBLIC` ou `anon`; les opérations restent accordées à `authenticated` et filtrées par les policies owner/admin.
- Build Vercel, déploiement Edge Function, tests 401/403/200 avec comptes réels et QA mobile à effectuer avant de considérer le flux validé.


## 2026-11-25 — Billetterie gratuite et défi de présence : règles serveur restaurées (P0)
- Migration live appliquée et versionnée : `20261125122943_harden_ticket_booking_and_presence_challenge`.
- `book_ticket` ne peut plus créer de billet payant sans Mobile Money; quantité bornée de 1 à 10; vérifications serveur du statut publié, option active, fenêtre de vente, stock et capacité. Le montant enregistré est forcé à 0 pour ce parcours gratuit.
- `purchase_tickets_multi` conserve son rôle gratuit uniquement, refuse les prix négatifs/payants et vérifie aussi l'activation de l'option, les dates de vente, le stock et la capacité côté serveur.
- Défaut critique corrigé dans `complete_presence_challenge` : l'ancienne version acceptait toute chaîne de 3 caractères, ignorait la fenêtre de 15 minutes et marquait le billet comme `used`, ce qui pouvait empêcher son scan d'entrée. La version restaurée impose 3 essais, la fenêtre `starts_at → starts_at + 15 minutes`, et ne modifie plus le statut d'admission.
- Les secrets de motif sont maintenant conservés dans `ticket_presence_challenges`, table avec RLS forcé et aucun privilège client. Un trigger serveur crée un secret par billet; le motif attendu est un ordre déterministe des quatre nœuds, compatible avec l'interface tactile existante. Les billets existants sont backfillés.
- Vérifications SQL live : les deux RPC de réservation conservent EXECUTE authenticated; anon n'a pas EXECUTE sur `book_ticket`; les secrets ne sont lisibles ni par anon ni par authenticated; la fonction utilise bien la vérification de motif, la fenêtre et la limite de trois essais, et ne marque plus le billet `used`. Le trigger est actif. La table tickets était vide lors du contrôle, donc le déclenchement sur une vraie insertion reste à tester.
- Aucun paiement, billet, stock ou badge réel n'a été modifié. Tests end-to-end avec billets de test et QA mobile restent à effectuer.


## 2026-11-25 — Liens cadeaux : réclamation et régénération sécurisées (P1)
- Migration live appliquée et versionnée : `20261125123419_secure_gift_ticket_claim_and_link_regeneration`.
- `claim_ticket_by_token` refuse désormais les billets annulés, remboursés, expirés ou non transférables; seuls les cadeaux non réclamés en statut valide/actif peuvent être pris. Si le billet est déjà attribué à un compte distinct de l'acheteur, seul ce compte peut le réclamer.
- `regenerate_claim_link` est réservé à l'acheteur et aux billets cadeaux encore non réclamés en statut valide/actif. Le bloc conditionnel précédent était sans effet et permettait de renouveler un lien après réclamation; il a été supprimé.
- `src/features/tickets/rpc.ts` ne renvoie plus de faux succès local lorsqu'une RPC serveur est absente pour la réclamation, la régénération de lien, les remboursements ou le défi de présence. En mode Supabase configuré, une RPC manquante remonte une erreur explicite; le mode local reste géré au niveau service lorsque Supabase n'est pas configuré.
- Vérification statique : les cinq fallbacks « mode local » ont disparu du transport RPC; les fonctions serveur ont été relues après application. Tests avec vrais comptes et vrais liens non effectués.


## 2026-11-25 — Rappels d'événements : endpoint cron privé (P1)
- Migration live appliquée et versionnée : `20261125123618_protect_event_reminders_cron_endpoint`.
- Le endpoint `event-reminders` était public sans authentification et utilisait `service_role` pour lire les billets et créer des notifications. Il vérifie maintenant un secret aléatoire stocké dans Supabase Vault via une RPC accessible uniquement à `service_role`.
- Le job `event-reminders-hourly` envoie ce secret depuis Vault dans l'en-tête `x-cron-secret`; le secret n'est ni dans GitHub ni dans le frontend.
- Le handler refuse les méthodes autres que POST, les appels sans secret et les secrets invalides. Il exclut les billets `pending` des rappels (seuls `valid` et `active` sont notifiés) et remonte les erreurs d'accès/écriture au lieu de les ignorer.
- Le job cron a été mis à jour via `cron.alter_job` après vérification de son existence. La migration SQL et le code de l'Edge Function sont versionnés sur `FRONTEND-iA`.
- Edge Function `event-reminders` v3 active avec `verify_jwt=false` protégé par le secret Vault; le job cron a été configuré et ses en-têtes vérifiés. Aucune exécution cron réelle ni notification réelle n'a été déclenchée manuellement.


## 2026-11-25 — Assistant IA : quotas persistants et protection contre l'abus (P1)
- Migration live appliquée et versionnée : `20261125124033_create_server_only_ai_request_quotas`.
- Création de `ai_rate_limits` avec RLS forcé et aucun privilège Data API client. La RPC `check_and_increment_ai_quota(text, boolean)` est exécutable uniquement par `service_role`, valide le format de l'identifiant fourni par le serveur et stocke son SHA-256 plutôt que l'identifiant brut.
- Limites atomiques : 20 requêtes/10 min et 60/24 h par compte; 5/10 min et 15/24 h pour les invités. Verrou transactionnel par identifiant pour éviter les dépassements concurrents.
- Le code Edge IA existant consommait déjà cette RPC mais la table/fonction n'existait pas dans le projet live; la migration rétablit le contrat avant le déploiement du code.
- Le handler borne désormais le corps à 24 000 caractères, limite la clé Gemini utilisateur à 256 caractères, utilise `cf-connecting-ip` ou `x-forwarded-for` pour l'identité invitée, exige les clés Supabase serveur, et autorise le domaine stable Preview `FRONTEND-iA`.
- Les journaux IA ne reprennent plus les emails, rôles metadata ni UUID utilisateur. Les rôles de metadata modifiables ne sont pas utilisés pour l'autorisation.
- Edge Function `ai-assistant` v8 active avec mode invité conservé (`verify_jwt=false`) et quota serveur obligatoire. Test SQL transactionnel simulant le claim `service_role` réussi : `allowed=true`, 19 requêtes restantes sur la fenêtre, rollback effectué. Tests HTTP réels 401/429 et scénarios multi-utilisateurs non effectués.


## 2026-11-25 — Assistant IA : dépendances partagées compatibles Edge Runtime
- Le premier déploiement de la version du dépôt a été refusé par le bundler, car les imports directs `../../../src/constants/*` sortaient du périmètre de la fonction Edge.
- Le prompt système et les préférences IA ont été centralisés dans `supabase/functions/_shared/`; les modules frontend `src/constants/aiSystemPrompt.ts` et `aiPreferences.ts` les réexportent. L'Edge Function importe maintenant les mêmes sources via `../_shared`, évitant une copie divergente.
- Aucun changement de contenu fonctionnel du prompt ou des préférences.


## 2026-11-25 — Vérification des déploiements et points opérationnels restants
- Edge Functions actives : `platform-stats` v6 (`verify_jwt=true`, contrôle du rôle admin), `event-reminders` v3 (secret Vault + job cron) et `ai-assistant` v8 (quota persistant).
- Vercel Preview READY pour le commit `0e6b058b075cc8694b0154586a8b4cfa17003253` : `https://gbaigbance-event-xi7phav78-shogun10.vercel.app`. Vite a transformé 3 336 modules et terminé en 5,44 s. Le build n'est pas une QA fonctionnelle ou mobile.
- Contrôle des profils au moment de l'audit : 0 ligne dans `profiles`, donc aucun compte admin provisionné. `platform-stats` refusera correctement l'accès à tous les comptes tant qu'un administrateur n'aura pas été créé/provisionné par une procédure contrôlée; aucun rôle n'a été attribué automatiquement.
- Point métier restant P1 : `review_refund` marque actuellement un remboursement comme `refunded` et le billet comme remboursé sans appel à un fournisseur de paiement. Aucun Edge Function de remboursement n'a été trouvé. Il faut séparer approbation, transfert réel et confirmation finale avant de présenter le flux comme un remboursement Mobile Money automatique.
- QA navigateur, réservation réelle, scan QR, test de réclamation cadeau, rappel cron réel et vérification iPhone restent à effectuer.


## 2026-11-25 — Analytics : compteur de vues déplacé hors de l'API publique
- Migration live appliquée et versionnée : `20261125124452_move_event_view_definer_to_private_schema`.
- Le compteur conserve la même signature publique pour ne pas casser le frontend, mais `public.record_event_view` est maintenant SECURITY INVOKER. La logique SECURITY DEFINER est déplacée dans `private.record_event_view_internal`, hors des schémas exposés par PostgREST.
- La clé de déduplication ne dépend plus du UUID librement fourni par le navigateur : compte connecté = `auth.uid()`; invité = empreinte SHA-256 de l'IP proxy (`cf-connecting-ip`, puis `x-forwarded-for`). Une visite par événement et par jour.
- Les événements non publiés ou de démonstration ne sont toujours pas comptabilisés.
- Vérification SQL : wrapper public SECURITY INVOKER; le schéma `private` n'est pas dans `pgrst.db_schemas`; droits de la fonction interne limités à l'appel du wrapper. Test d'incrément réel non exécuté, car aucun événement réel n'est présent dans la base au moment du contrôle.
- Deux entrées de migration identiques pour le quota IA existaient dans l'historique Supabase (`20261125124033` et `20261125124109`); le second fichier idempotent a été ajouté au dépôt pour réconcilier l'historique et la branche.


## 2026-11-25 — Collaborations : acceptation sans réactivation ni publication automatique (P1)
- Migration live appliquée et versionnée : `20261125124605_prevent_collaboration_reactivation_and_auto_publish`.
- `accept_collaboration` exige maintenant une session, verrouille l'invitation et n'accepte que le statut `pending`. Une invitation déjà acceptée est idempotente; une invitation refusée/retirée ne peut plus être réactivée par son ancien destinataire.
- Suppression de la publication automatique de l'événement quand toutes les invitations sont acceptées. L'acceptation d'une collaboration ne peut plus contourner le flux de validation/publication de l'événement; l'organisateur/admin conserve la décision via le flux de statut.
- Les policies RLS de collaboration restent en place; aucun événement n'a été publié ni modifié pendant la migration.


## 2026-11-26 — Localisation complète du tableau de bord organisateur (P2)
- Tâche active reprise : finaliser l'i18n de OrganizerDashboardScreen qui avait encore de nombreux hardcodes malgré les clés existantes dans organizer.json.
- Remplacement des libellés hardcodés par t('organizer', ...) pour : en-tête (titre artiste/dashboard, retour, bouton scanner), action rapide scanner, onglets, liste des événements, états (annulé/en attente/...), formulaire de création (labels, placeholders, submit), modal de suppression (titres, descriptions, compteurs, traitement), toasts de succès/erreur.
- Utilisation exclusive des clés déjà présentes dans fr/en organizer.json. Aucun nouveau domaine.
- Commit : ac6c6204e52092dcd159b8c2a664a42b7f586806 sur FRONTEND-iA.
- Tailles : avant 33350 o, après 34143 o (+2,4 %, attendu). Relecture distante confirmée, contenu contient bien les appels t().
- Incident : deux tentatives via connecteur ont écrit des placeholders (19 o puis 33 o). Restauration immédiate de la version saine via gh api, puis push propre de la version localisée. Cause : content argument mal formé dans l'appel outil. Consigné.
- Vérifications : relecture distante OK, taille OK, pas de rétrécissement. Build/typecheck/lint/QA visuelle non exécutés cette session.
- Prochaine étape : localiser les éléments restants du formulaire de création (types de billets, recherche collaborateurs) ou polish responsive du dashboard. Ne pas toucher Explorer par catégorie.
- Aucun changement backend.


## 2026-11-26 — Scanner hors-ligne : préchargement compatible avec la projection publique (P1)
- Diagnostic vérifié : `preloadEventTicketsForOffline` utilisait une jointure `profiles(name, phone)` depuis `tickets`. L'inspection live des contraintes confirme que `tickets.user_id` référence `auth.users(id)`, sans clé étrangère directe vers `profiles`; la relation imbriquée demandée n'est donc pas disponible. En parallèle, la lecture de `profiles` est désormais limitée au propriétaire/admin, tandis que `public_profiles` expose uniquement les champs publics avec SELECT accordé à anon/authenticated et une policy RLS de lecture.
- Correction dans `src/services/ticketScannerService.ts` : sélection des seules colonnes utiles du billet; récupération séparée des noms via `public_profiles(id, name)`, par lots de 200 identifiants; priorité au nom de destinataire (`recipient_name`), puis au nom public, puis au libellé neutre « Participant ». Le téléphone n'est plus demandé ni mis en cache.
- Aucun changement sur « Explorer par catégorie », les autres parcours, le backend, les migrations, le schéma, les API, les données, les dépendances ou les lockfiles.
- Commit code : `e5bc583872819195b3f28687ac323a99d64464e5` sur `FRONTEND-iA`.
- Validation : relecture distante du fichier après commit; ancienne jointure privée absente et nouvelle projection publique présente. Inspection Supabase live des colonnes, clés étrangères, privilèges et policies RLS confirmée. La base ne contenait aucune ligne de billet/profil lors du contrôle : test réel avec événement et compte organisateur impossible à effectuer dans cette passe.
- Preview Vercel pour le commit code : READY, URL https://gbaigbance-event-60o9oexs6-shogun10.vercel.app. Build Vite réussi (2 938 modules, 4,31 s), génération PWA réussie (79 entrées de précache) et 14 fichiers de preview synchronisés; statut Vercel success. Le script build ne lance pas le typecheck : `npm run typecheck` et `npm run lint` non exécutés.
- QA mobile hors-ligne, test d'un scan réel, synchronisation de la file au retour du réseau et validation visuelle navigateur non exécutés. Le navigateur connecté n'était pas accessible; UIAudit et Superdesign ne sont pas exposés parmi les outils disponibles.
- Prochaine priorité : tester sur un événement de démonstration avec un compte organisateur/collaborateur, précharger les billets en ligne, passer hors-ligne, contrôler les états valide/déjà utilisé/annulé, puis vérifier la synchronisation sans doublon au retour du réseau.

## 2026-11-27 — Cycle de vie du billet et fiabilisation du Ticket Scanner (P1)
- Audit du code et de la fonction Supabase live validate_ticket_qr : l'ancienne version marquait comme used tout statut sauf used/cancelled/refunded/expired, ce qui pouvait admettre un billet pending. Le scanner basculait aussi en admission locale après une erreur RPC alors que le navigateur se disait en ligne.
- Migration Supabase harden_ticket_checkin_and_record_admission appliquée : seules les lignes valid ou active sont admises; les statuts utilisés, annulés, remboursés, expirés et pending/inconnus sont refusés avec des codes distincts. Mise à jour conditionnelle atomique sous verrou; métadonnées checked_in_at et checked_in_by persistées; réponse limitée aux champs nécessaires au scanner. EXECUTE révoqué à PUBLIC/anon, conservé à authenticated/service_role.
- src/services/ticketScannerService.ts : préchargement paginé par lots de 500, statistiques via compteurs exacts serveur, refus hors ligne des statuts non admissibles, suppression de l'admission d'un QR signé absent du cache, aucune admission locale après erreur RPC en ligne, déduplication locale de la file et conservation des échecs temporaires. Les conflits définitifs sont distingués.
- src/features/tickets/service.ts : expose les codes de résultat et l'heure serveur de validation.
- src/components/TicketScannerModal.tsx : verrou de traitement par ref, erreur de validation contrôlée, notification des conflits hors ligne et rafraîchissement des statistiques après synchronisation.
- Migration appliquée avec succès sur Supabase projet lwwiolbofrqakvrdvbbj. Vérification post-migration et advisors à exécuter; la table tickets était vide au contrôle initial, donc aucun scénario E2E avec billets réels n'était disponible.
- Limite inhérente : deux appareils séparés qui scannent le même billet pendant qu'ils sont tous deux hors ligne ne peuvent pas se coordonner. La synchronisation détecte le conflit au retour du réseau, mais ne peut pas empêcher rétroactivement une double entrée. Pour les événements à risque, utiliser un seul appareil de contrôle hors ligne ou maintenir les scanners connectés.
- Validation : Preview Vercel READY pour c460815f2c1917ac251b0d63951b78db06567e0c; build Vite/PWA réussi. Typecheck/lint non exécutés. Tests authentifiés avec billets de démonstration (pending, valid, active, used, cancelled, refunded, expired), double scan concurrent en ligne, et cycle hors ligne → synchronisation → conflit.
- Aucun changement sur Explorer par catégorie, ni sur les données de billets existantes, les paiements, les dépendances ou les lockfiles. Branche FRONTEND-iA uniquement.

- Suivi UI : l'heure serveur de check-in est affichée pour les validations en ligne; les scans hors ligne sont identifiés comme provisoires. L'historique distingue en attente, synchronisé et conflit; les conflits confirmés sont requalifiés.

- Dernière validation de déploiement : commit `bb06d33f6e28d0d42e5378584a482cd091c9cea2`; Vercel a confirmé la compilation Vite (3,77 s), la génération PWA (79 entrées) et la synchronisation de 14 fichiers preview. L'état final Vercel était encore BUILDING au dernier contrôle, donc ne pas annoncer READY pour ce commit sans nouveau contrôle.
- Typecheck/lint non exécutés : tentative de clone local impossible pendant l'incident DNS GitHub (`Could not resolve host`). Le script `npm run build` ne lance pas `npm run typecheck` ni `npm run lint`.

## 2026-11-27 — Scanner : localisation complète des labels de statut et badge de file d'attente hors ligne (P2)
- Suppression des derniers ternaires de langue hardcodés dans `TicketScannerModal.tsx` (Checked in / Pending sync / Synced / Conflict + message de conflits hors ligne).
- Ajout des clés `scannerModal.checkedIn`, `pendingSync`, `synced`, `conflict` et `messages.offlineConflicts` dans `organizer.json` FR et EN.
- Amélioration visuelle : badge compteur de scans en attente de synchronisation affiché sur l'indicateur hors ligne (quand pending > 0). Plus clair pour l'opérateur de guichet sur mobile.
- Aucun changement sur Explorer par catégorie, backend, paiements ou données.
- Commits sur `FRONTEND-iA` : 2868010 (FR), d4fa953 (EN), df0d092 (TSX).
- Relecture distante : tailles OK (organizer FR 11815, EN 10835, TSX 45209). Contenu vérifié (pendingSyncCount présent).
- Vérifications : pas de typecheck/lint/build exécuté dans cette session. Rendu non contrôlé en navigateur.
- Prochaine étape : polish du overlay de résultat (cibles tactiles plus grandes, meilleur contraste) ou états empty/loading du scanner.


## 2026-11-27 — Scanner : overlay de résultat responsive et accessible (P2)
- Chantier ciblé hors « Explorer par catégorie », laissé strictement intact conformément à la consigne utilisateur.
- `src/components/TicketScannerModal.tsx` : carte de résultat limitée à la hauteur disponible dans le viewport caméra et scrollable sur les écrans courts; marges adaptées mobile; noms de participants, formules, sièges, horodatages et titres d’événement autorisés à revenir à la ligne sans déborder; action « Scanner le billet suivant » conserve une cible d’au moins 48 px et reçoit un focus visible.
- Le titre et le message de résultat sont annoncés par les régions live ARIA. L’animation de rebond du succès respecte `prefers-reduced-motion`.
- Le libellé du contrôle hors ligne en attente de confirmation serveur est désormais traduit via `scannerModal.offlineCheckPending` dans `src/locales/fr/organizer.json` et `src/locales/en/organizer.json`.
- Commits code sur `FRONTEND-iA` : `19c2f8334c04922279a85552d13fb834ddc8d800` (overlay et wrapping), `44bbbe8a86ca542b3d12037bf10b48ebca0d57da` (FR), `fc12ee060dfbe55e78de9518f9903918df9d957d` (EN), `de311b23437b55ab676046ef9f89b5c966b62cfe` (hauteur relative au viewport caméra et annonces ARIA).
- Relecture distante des trois fichiers après écriture : tailles exactes confirmées (TSX 45 794 caractères, FR 11 623, EN 10 894); JSON FR/EN parsables et clés `scannerModal` alignées.
- Preview Vercel READY pour `de311b23437b55ab676046ef9f89b5c966b62cfe` : https://gbaigbance-event-m70ta4qz5-shogun10.vercel.app. Build Vite a transformé 2 938 modules; génération et synchronisation PWA à confirmer dans les logs finaux. Typecheck et lint non exécutés.
- QA visuelle mobile/iPhone et tests caméra, résultat en ligne/hors ligne non exécutés : clone local impossible (DNS GitHub) et contexte navigateur connecté indisponible. Ne pas présenter ces contrôles comme réussis.
- Aucun changement backend/API, migration, donnée métier, dépendance ou lockfile; aucun PR.
- Prochaine priorité : contrôle visuel sur petit viewport iPhone et test réel des résultats validés/refusés, puis états empty/loading du scanner si la QA confirme le layout.

## 2026-11-28 — P0 Restauration OrganizerDashboardScreen.tsx
- Constat : fichier distant sur FRONTEND-iA était PLACEHOLDER_TSX (troncature silencieuse).
- Restauration depuis commit sain ac6c6204e52092dcd159b8c2a664a42b7f586806 (version localisée principale).
- Commit de restauration : bda5a141c312ad6bf92a4cd4bd89d79576e4199d
- Taille avant : ~15 o (placeholder), après : 34143 o. SHA blob 054433de26545733d3010a3cc8dc6e539da64cd3 confirmé.
- Relecture distante : contenu réel (imports, t() pour titres/onglets/états), pas de placeholder.
- Incident consigné. Aucune autre modification sur ce fichier cette session.
- Prochaine étape : finir localisation des hardcodes restants (erreurs création) par petits commits, ou polish états empty/loading du dashboard.

## Tâche active
Restauration P0 terminée. Reprendre polish scanner ou localisation restante dashboard.


## 2026-11-28 — P0 : nouvelle troncature du tableau de bord organisateur, restauration et i18n finale
- Branche contrôlée avant intervention : `FRONTEND-iA`, HEAD initial `8dc7f9571aeaafcf19e46fa8592d5336cb456925`; dépôt accessible en lecture/écriture. La branche est restée la seule cible.
- Après la restauration P0 consignée plus haut, une nouvelle vérification a révélé que `src/screens/OrganizerDashboardScreen.tsx` avait de nouveau été remplacé par `CONTENT_FROM_FILE` (17 caractères, blob `20c46a424f62f4f111c4d7e9ff0f52f5218c47dc`). L'historique récent montrait aussi une version `PLACEHOLDER_TSX` de 15 caractères. Les ressources FR/EN étaient restaurées sur la tête actuelle; elles ont été conservées et enrichies. Aucun contenu de `PROJECT_MEMORY.md` n'a été consulté.
- Restauration du composant depuis la version saine `ac6c6204e52092dcd159b8c2a664a42b7f586806` (34 123 caractères, blob `054433de26545733d3010a3cc8dc6e539da64cd3`), puis réapplication des localisations manquantes dans le formulaire de création et l'invitation de collaborateurs.
- `src/screens/OrganizerDashboardScreen.tsx` : options de billets, types Free/Standard/VIP/VVIP, placeholders, libellés de recherche, états vide/chargement, rôles artiste/co-organisateur, URL de couverture, programme/sponsors et description de confirmation utilisent les clés i18n. Le libellé Standard initialisé et réinitialisé suit la langue active. Ajout de noms accessibles aux actions créer, supprimer une option, retirer un collaborateur, gérer programme/sponsors et supprimer/gérer un événement; les actions icône de suppression ont aussi `type=button`.
- `src/locales/fr/organizer.json` et `src/locales/en/organizer.json` : ajout aligné des clés `create.collabPerformer`, `create.collabCoOrganizer`, `create.removeCollaborator`, `create.removeTicketOption`, `create.ticketTypeLabel`.
- Fichiers de cette intervention : `src/screens/OrganizerDashboardScreen.tsx`, les deux ressources `organizer.json`, `FRONTEND_MEMORY.md`.
- Contrôles statiques avant commit : 33 remplacements exacts appliqués une seule fois; JSON FR/EN parsables; ensembles de clés FR/EN identiques; chaînes codées en dur ciblées absentes; taille du composant restauré et enrichi attendue ~35,4 ko (contre 17 caractères corrompus). Build, typecheck, lint, tests fonctionnels et QA visuelle navigateur/mobile restent à confirmer après déploiement.
- Aucun changement backend/API, migration, données métier, dépendance, lockfile ou parcours « Explorer par catégorie ». Aucun PR. Aucun commit sur une autre branche.
- Prochaine étape : vérifier le build Vercel de ce commit, puis contrôler le formulaire de création et l'invitation collaborateur en FR/EN sur mobile; ne pas toucher à « Explorer par catégorie ».
