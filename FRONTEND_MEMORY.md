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
