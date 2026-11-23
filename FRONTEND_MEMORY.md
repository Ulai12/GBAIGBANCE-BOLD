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
