# CHATGPT Frontend Memory

## Cadre de continuité
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Mémoire dédiée exclusive à ChatGPT. Ne jamais lire, modifier, supprimer ou remplacer `PROJECT_MEMORY.md`.
- Branche de travail : `FRONTED-iA` (branche distincte de `main`).
- Stack observée : React 18, TypeScript, Vite, Tailwind CSS, React Router, Motion.
- En cas de divergence, le code et Git font autorité.

## Historique
- 2026-11-12 — Initialisation de cette mémoire sur `FRONTED-iA`.
- 2026-11-12 — Correctif P1 du checkout multi-billets dans `src/components/BookingModal.tsx` : le changement de destinataire conserve un tableau aligné sur la quantité choisie ; les ajouts de quantité créent des bénéficiaires distincts ; garde-fou avant achat pour normaliser le nombre de destinataires ; synchronisation du premier nom cadeau.
  - Impact visé : empêcher une divergence entre montant affiché et nombre de billets créés.
  - Vérification statique : cohérence avec `purchaseTicketsMulti`, qui calcule le montant et génère les billets depuis `recipients.length`.
- 2026-11-12 — Correctif P0 du build dans `src/components/EventCard.tsx` : fermeture manquante du conteneur « CONTENT LAYER » avant le bouton de superposition. Le fichier était inchangé par le correctif réservation ; l'erreur JSX a été signalée par Vercel.
- 2026-11-12 — Audit P1 du parcours invité : constat confirmé, le CTA de la page détail ouvrait directement sa modale locale sans utiliser le garde d'authentification global. Le service traite `guest-*` en mode local de démonstration au lieu d'appeler la RPC Supabase ; les billets ne constituent donc pas des commandes serveur réelles. Décision : ne pas ouvrir une réservation invitée tant que le backend ne la prend pas explicitement en charge.
- 2026-11-12 — Correction du parcours d'accès à la réservation : les CTA de la page détail et la sélection d'une catégorie de billet délèguent désormais au gestionnaire global `onBook`. Celui-ci impose une session, transmet l'option choisie à la modale globale et conserve l'intention de réservation (événement + option) pendant la connexion ou l'inscription ; après authentification, la modale globale reprend automatiquement le parcours. Suppression de la modale locale concurrente de la page détail.
  - Fichiers fonctionnels : `src/App.tsx`, `src/screens/EventDetailScreen.tsx`, `src/navigation/RouteWrappers.tsx` (contrat de callback option de billet).
  - Impact visé : empêcher la création locale d'un faux succès de réservation pour les visiteurs non connectés ; un utilisateur authentifié passe par un seul flux de réservation.
- Correctif JSX précédent : `src/components/EventCard.tsx`. Aucun fichier backend, Supabase, API, lockfile ou configuration de dépendances modifié pendant les chantiers UI.
 

- 2026-11-12 — Audit fonctionnel de l'accueil et des statistiques :
  - Catégories accueil : la requête serveur limitait les résultats aux 60 premiers événements publiés avant filtrage, ce qui pouvait masquer des événements plus anciens ; les réponses asynchrones pouvaient aussi remplacer les résultats d'une catégorie sélectionnée ensuite. La requête utilise maintenant la pagination existante (`selectPages`) et l'effet ignore les réponses obsolètes ; les correspondances déjà chargées restent visibles sans flash de chargement.
  - Billetterie/statistiques : les états `pending`, `frozen`, `refunded` et `expired` ne sont pas des ventes confirmées. Le flux paiement crée des billets `pending`, puis les passe à `valid` après confirmation ; les agrégats plateforme et organisateur comptent désormais uniquement `valid` et `used`.
  - Graphiques accueil : la courbe utilisait un échantillon limité d'événements issus des flux de découverte (accueil), pas l'ensemble des événements actifs. `fetchPlatformStats` fournit désormais une timeline complète des événements actifs, consommée directement par le graphique. Les clés de timeline billets sont uniques même lorsque plusieurs billets partagent le même événement et la même milliseconde.
  - Mode sans WASM : ajout d'un calcul TypeScript de repli pour dédoublonner les billets confirmés, totaliser les ventes, répartir les catégories et alimenter la timeline au lieu de retomber sur des comptes incomplets ou nuls.
  - Fichiers fonctionnels : `src/features/events/queries.ts`, `src/features/organizers/service.ts`, `src/screens/HomeScreen.tsx`, `src/components/GbaigbanceStatsDashboard.tsx`.
  - Aucun changement de schéma Supabase, RPC, migration, API, dépendance ou lockfile.

## État courant
- Vérifications : le build Vercel du correctif de reprise de réservation (`e177174`) a été confirmé READY. Pour l'audit catégories/statistiques, un déploiement intermédiaire (`54dbd78`) est READY ; le déploiement du dernier commit (`23fed96`) était encore QUEUED lors du dernier contrôle. Aucun test d'interaction réel avec Supabase, typecheck séparé, lint, tests locaux ni validation visuelle responsive n'a été exécuté.
- Problèmes ouverts : la réservation sans compte n'est pas prise en charge par le service de production ; il faudra concevoir un vrai flux invité serveur (identité, paiement, attribution et récupération) avant de l'activer. Les catégories et statistiques doivent encore être exercées avec un jeu de données Supabase réel pour confirmer les chiffres affichés.
- Prochaine priorité : confirmer le dernier build Vercel, puis tester la sélection rapide de plusieurs catégories et comparer les KPI/graphes aux billets `valid`/`used` et aux événements actifs réels.

- 2026-11-12 — Refonte de la classification dans l'exploration :
  - L'exploration utilise désormais les 5 catégories parentes et expose les sous-catégories de la catégorie sélectionnée ; un filtre parent inclut ses enfants, un filtre enfant reste strictement limité à cette sous-catégorie.
  - La sous-catégorie connue est la source de vérité pour le parent ; les correspondances par mots-clés du titre (ex. « fest », « expo », « conf ») ont été retirées pour éviter les faux positifs.
  - Les événements historiques sans métadonnées enrichies conservent le filtre de catégorie historique.
- 2026-11-12 — Stabilisation de l'exploration et des statistiques :
  - Suppression du polling périodique de l'écran Explore ; les chargements viennent de l'ouverture/changement de filtres et des notifications Supabase Realtime.
  - Le skeleton d'événements n'est affiché que pendant le premier chargement sans cache ; les réponses obsolètes sont ignorées et les résultats existants restent visibles lors des synchronisations silencieuses.
  - Suppression du bouton d'actualisation et du polling 60 s du tableau de statistiques ; les événements Realtime et les événements applicatifs restent les déclencheurs de mise à jour.
  - Suppression de l'étiquette technique Rust/calcul dans l'interface ; le moteur de calcul interne est conservé et n'est plus exposé à l'utilisateur.
  - Correction du contrat timeline : les statistiques utilisent maintenant `starts_at_ms` et `attendees` ; les chemins de repli lisent aussi les bons champs et n'accèdent plus à une variable `events` inexistante.
  - Ajustements de densité, de rythme et d'interactions des KPI sans toucher à l'en-tête « Gbaigbance en chiffres ».
  - Fichiers : `src/constants/categories.ts`, `src/screens/ExploreScreen.tsx`, `src/components/GbaigbanceStatsDashboard.tsx`.
  - Sentry : aucun diagnostic Sentry n'a été exécuté faute de jeton d'accès configuré dans l'environnement ; ne jamais demander au user de coller le jeton dans le chat.
  - Vérification en attente : build/typecheck et validation visuelle responsive après les derniers commits ; pas de test Supabase réel effectué.

- 2026-11-12 — Vérification post-correctif :
  - Le premier build Vercel a détecté un import `Heart` dupliqué dans `ExploreScreen.tsx`; le doublon a été supprimé immédiatement.
  - Le déploiement Preview du commit `36191b7` sur `FRONTED-iA` est confirmé `READY`.
  - Le polling d'Explore a été supprimé et le chargement protège désormais contre les réponses réseau obsolètes ; les mises à jour Realtime restent actives.

- 2026-11-12 — Alignement de la section d'accueil « Explorer par catégorie » :
  - Remplacement des 8 anciens filtres ambigus par les 5 catégories parentes et leurs sous-catégories affichées après sélection.
  - La requête distante d'une catégorie est désormais déclenchée uniquement au changement de sélection ; les mises à jour globales/realtime fusionnent les nouveaux événements localement sans relancer la requête ni réafficher le skeleton.
  - Le déploiement Preview du commit `0af15ae` sur `FRONTED-iA` est confirmé `READY` ; build Vite réussi.
