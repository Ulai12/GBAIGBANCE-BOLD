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
- Vérification statique : garde d'identité, invalidation des requêtes obsolètes et chemins de déconnexion présents; aucune modification des écrans de catégories. Build Preview à exécuter après push; typecheck, lint, tests automatisés et QA mobile multi-comptes non exécutés à ce stade.
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
