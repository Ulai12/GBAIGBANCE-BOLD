# FRONTEND_MEMORY.md — Mémoire frontend ChatGPT

## Règles permanentes
- Branche Git unique : `FRONTEND-iA`. Vérifier la branche avant toute écriture et avant chaque commit.
- Ne jamais créer ou ouvrir de pull request sans demande explicite.
- Ne jamais modifier `main`, `Frontend-IA` ou une autre branche.
- Ne jamais lire, modifier ou utiliser `PROJECT_MEMORY.md`.
- Ne pas toucher à la section « Explorer par catégorie » : l'utilisateur la considère parfaite et l'a déclarée intouchable, sauf demande explicite contraire.
- Préserver les fonctionnalités, données, hiérarchies métier et contrats backend existants.
- Un seul chantier principal par session; pas de commits de remplissage.
- Distinguer systématiquement réalisé, testé, non vérifié et recommandé.

## Projet
- Dépôt : https://github.com/Ulai12/GBAIGBANCE-BOLD
- Branche autorisée : `FRONTEND-iA`
- Stack observée : React 18, TypeScript, Vite, Tailwind, Supabase.
- Projet Supabase utilisé par le client : `lwwiolbofrqakvrdvbbj` (GBAIGBANCE EVENTS).
- Vision de référence création événement : `docs/CREATE_EVENT_UX_VISION.md`.

## Tâche active (21 novembre 2026)
Synchronisation avec main et poursuite de la localisation / polish responsive d'EventDetailScreen.

### Objectif
Intégrer les avancées de main (localisation EventDetailScreen) dans FRONTEND-iA et assurer une UI cohérente, responsive et professionnelle sur l'écran de détail événement (parcours achat critique).

### Progression
- Correctifs P0 build du 21 nov (JSON tickets + BookingModal) confirmés sur FRONTEND-iA.
- main a avancé avec localisation complète d'EventDetailScreen (commits récents).
- FRONTEND-iA est en retard ; fusion recommandée par le propriétaire pour éviter divergences.
- EventDetailScreen sur FRONTEND-iA utilise déjà partiellement `t('events', 'detail.*')`.

### Fichiers concernés
- src/screens/EventDetailScreen.tsx
- src/locales/fr/events.json
- src/locales/en/events.json
- FRONTEND_MEMORY.md

### Dernière action
2026-11-21 — Lecture mémoire, vérification branches, constat divergence avec main. Mise à jour mémoire.

### Prochaine étape
- Propriétaire : merger main dans FRONTEND-iA (ou autoriser PR).
- Continuer polish responsive des cartes date/heure/lieu et barre CTA sticky sur EventDetailScreen.
- Vérifier build Vercel après sync.

### Vérifications
- Branche FRONTEND-iA HEAD : cea0ee7c.
- Fichiers JSON tickets et BookingModal restaurés (pas de placeholder).
- Rendu navigateur : non vérifié cette session.

## Historique concis
- 2026-11-21 : Correctifs P0 JSON + BookingModal. Constat avance main.
- 2026-11-20 : Fixes date/heure wizard + shell Event Creation Studio.
- Précédent : Localisations Home, Profile, Tickets.

## Incidents d'écriture
Aucun cette session.

## Backlog priorité
P0 : Sync main → FRONTEND-iA.
P1 : Polish responsive EventDetailScreen (info cards, sticky CTA, safe areas).
P2 : États manquants (chargement, vide, erreur) sur écrans clés.
P3 : Accessibilité (contrastes, cibles 44px).


## 2026-11-21 — Blocage P0 du build Vercel
- Diagnostic confirmé sur le déploiement Vercel du HEAD `14a3066e2f76c7b64e909af17676790968e74b85` : `builtin:vite-json`, erreur `expected ',' or '}' at line 804 column 5`.
- Cause exacte : virgule manquante après la clé `home.seeMore` dans `src/locales/fr/events.json`, juste avant l'objet `seeMore`.
- Correctif minimal : ajout de cette virgule uniquement; aucun libellé, donnée ou clé métier modifié.
- Validation locale de contenu : `JSON.parse` passe après correction; le catalogue anglais passait déjà.
- Fichier modifié : `src/locales/fr/events.json`.
- À vérifier : nouveau build Vercel après push. Typecheck, lint et rendu navigateur non exécutés à ce stade.


## 2026-11-21 — Restauration de « Explorer par catégorie »
- À la demande explicite de l'utilisateur, restauration exacte de `src/screens/HomeScreen.tsx` depuis le parent du commit UI `18153b0743bcaed86e62435f701595504f405ff3` (`ff9e0b9b97de990a6c85642cbc5adef43a00eac2`).
- Suppression de `src/components/CategoryTile.tsx`, composant ajouté uniquement par l'intervention responsive annulée.
- Objectif : revenir à l'apparence et au comportement de la section avant cette intervention, sans toucher aux données métier ni aux autres sections de l'accueil.
- Branche autorisée vérifiée avant écriture : `FRONTEND-iA`; HEAD initial confirmé : `18153b0743bcaed86e62435f701595504f405ff3`.
- Commits de restauration : b998bcd1a43adb4d77f1c1836bf4e9480b69318e (HomeScreen), 1c3d8a5f72355e27036a01dd880f69d6b30ff68b (suppression du composant).
- Tests build/typecheck/lint et validation visuelle : non exécutés dans cette restauration.
- Le correctif indépendant du JSON français (`ff9e0b9b97de990a6c85642cbc5adef43a00eac2`) est conservé.
- Prochaine étape : vérifier le déploiement et le rendu réel de la section restaurée; ne plus modifier cette section sans nouvelle demande explicite.


## 2026-11-21 — Redirection des événements à billetterie externe
- Demande utilisateur : corriger le parcours des événements dont l'accès est de type `external`, afin que le CTA redirige vers le site de vente fourni par l'organisateur au lieu d'ouvrir le tunnel de réservation interne / d'exiger une connexion GBAIGBANCE.
- Diagnostic : `handleBookEvent` dans `src/App.tsx` envoyait tous les événements vers `BookingModal` après le contrôle de session. Les événements externes pouvaient donc être interceptés par le modal et le parcours d'authentification, alors qu'ils doivent utiliser leur propre billetterie.
- Correctif : intercepter `access_type === 'external'` avant le contrôle de session; valider `external_ticket_url`; ajouter `https://` aux domaines sans schéma; autoriser uniquement HTTP/HTTPS; naviguer dans l'onglet courant pour éviter les bloqueurs de popup sur mobile/PWA. Si le lien est absent ou invalide, afficher un toast explicite et ne pas ouvrir le modal interne.
- Le parcours de réservation GBAIGBANCE reste inchangé pour les autres types d'accès. Aucun backend/API, aucune donnée métier et aucune section « Explorer par catégorie » modifiés.
- Fichier applicatif modifié : `src/App.tsx`.
- Tests build/typecheck/lint et validation navigateur : non exécutés avec les outils disponibles dans cette session; contrôle statique du flux et des branches HTTP/HTTPS effectué.
- Commit applicatif : `7caae87ffe65bb19ba7fda55936e877544f68268`, poussé et HEAD vérifié sur `FRONTEND-iA`.
- Statut CI immédiatement après push : aucun check retourné à cet instant.
- Prochaine priorité : valider sur mobile/PWA qu'un événement externe ouvre bien le domaine de l'organisateur, et que les liens manquants/invalides produisent un message clair.


## 2026-11-21 — Correctif anti-chargement infini du modal de réservation
- Signal utilisateur : le modal « Réserver des billets » affichait l'événement mais restait indéfiniment sur le spinner; réservation inutilisable.
- Diagnostic statique : `BookingModal` attendait `fetchTicketOptions(event.id)` sans délai maximal. Si la requête Supabase ne se termine pas, l'état `loading` pouvait rester actif sans fin. Le service masque aussi les erreurs réseau en renvoyant un tableau vide, ce qui ne garantit pas un état d'erreur exploitable.
- Correctif : délai maximal de 12 secondes sur le chargement des options; au dépassement, arrêter le spinner et afficher l'état « Inventaire indisponible » avec l'action « Réessayer » déjà prévue. Ajout d'un identifiant de requête pour ignorer les réponses obsolètes après une nouvelle tentative. Ajout d'un libellé de chargement explicite.
- Fichier applicatif modifié : `src/components/BookingModal.tsx` uniquement.
- Le parcours de sélection, les quantités, bénéficiaires, Mobile Money et la création de billets n'ont pas été modifiés. Aucune API/backend ni section « Explorer par catégorie » modifiés.
- Commit applicatif : `e38af8cde736b06d15e6def7fbfb499a263848fa`, poussé sur `FRONTEND-iA`.
- Vérification : contrôle statique du patch et des états de chargement; build/typecheck/lint, test réel Supabase et parcours de paiement non exécutés dans cette session. Ne pas présenter le correctif comme une validation du paiement.
- Prochaine étape P0 : lancer build/typecheck, puis tester une réservation réelle en environnement de test (options présentes, options absentes, erreur réseau/délai dépassé, nouvelle tentative, achat gratuit et paiement Mobile Money).


## 2026-11-21 — Diagnostic approfondi du chargement des billets
- Analyse du service `fetchTicketOptions` : les erreurs Supabase étaient absorbées et converties en tableau vide. Le modal pouvait donc afficher « Aucune option de billet configurée » en cas d'erreur réseau ou SQL, ce qui masquait la vraie cause.
- Correctif dans `src/features/tickets/service.ts` : ajout d'un paramètre optionnel `throwOnError` `false` par défaut, afin de préserver le comportement des autres appelants. En mode strict, les erreurs Supabase sont propagées.
- Correctif dans `src/components/BookingModal.tsx` : appel strict de `fetchTicketOptions(event.id, 0, true)`; le modal distingue maintenant un inventaire réellement vide d'un inventaire impossible à récupérer et donne une indication de connexion dans l'état d'erreur.
- Commits applicatifs : `8c6f6f97278474f828e09583f9fb18b4f950623e` (service), `7046b515d4b9e3db728c5245a656c64122c68eed` (modal), sur `FRONTEND-iA`.
- Contrat de paiement payant inspecté : `rpcInitiateTicketPayment` renvoie volontairement `PAYMENT_PENDING` car l'émission des billets est réservée à la confirmation serveur/webhook. `purchaseTicketsMulti` retourne actuellement ce statut sous forme `success: false`; `BookingModal` le présente donc dans l'alerte d'erreur générique. À traiter ensuite en concevant un véritable état « paiement en attente » et une confirmation fiable, sans émettre de billet avant le webhook.
- Tests build/typecheck/lint, requête Supabase réelle et paiement Mobile Money non exécutés; aucun achat réel effectué. Déploiement du dernier commit à vérifier.
- La synchronisation `main → FRONTEND-iA` reste une action à autoriser explicitement par le propriétaire; aucune fusion de branche effectuée.
- La section « Explorer par catégorie » est restée intacte.


## 2026-11-21 — Correction parcours billetterie externe et avatar du modal
- Retour utilisateur avec capture iPhone : un événement HELLOOO affichait « Aucun billet disponible » et l'image du modal était vide; l'utilisateur signale aussi que les événements utilisant leur propre site ne redirigent toujours pas correctement.
- Cause fonctionnelle identifiée : la création d'événements externes ne crée volontairement aucune ligne `ticket_options` (voir `src/features/events/mutations.ts`). Ces événements ne doivent donc jamais ouvrir le `BookingModal` interne.
- Renforcement du routage dans `src/App.tsx` : déclencher la redirection si `access_type === 'external'` OU si un `external_ticket_url` non vide existe. Ce deuxième critère protège aussi les événements dont `access_type` n'a pas été correctement hydraté depuis les données historiques.
- Correction du CTA dans `src/screens/EventDetailScreen.tsx` : remplacer le lien HTML indépendant par un bouton qui passe par `onBook(displayEvent)` et donc par la validation/normalisation URL centralisée de `App.tsx`. Le flux externe utilise le même onglet, sans modal ni connexion GBAIGBANCE.
- Correction du visuel de réservation dans `src/components/BookingModal.tsx` : remplacer l'image `event.cover_url` par `UserAvatar` du profil organisateur. Utilise le logo de l'organisation lorsqu'il existe et l'avatar déterministe généré par `UserAvatar` sinon; en cas d'image cassée, le composant retombe aussi sur son avatar généré.
- Fichiers applicatifs : `src/App.tsx`, `src/screens/EventDetailScreen.tsx`, `src/components/BookingModal.tsx`.
- Commits : `e425fda629fa791698bfac2fd5c544899faa267c`, `77eba394b57439c11139b56806fe06377658e70a`, `7000e12921e788def66081d9fc3b6cf843e37334`.
- La section « Explorer par catégorie » n'a pas été modifiée. Aucun changement backend ou de schéma.
- Limites : aucun test navigateur réel, aucune création d'événement ni redirection mobile exécutée; build/typecheck/lint non disponibles dans cette session. Déploiement à confirmer après le push.
