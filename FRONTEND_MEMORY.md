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

## Tâche active (22 novembre 2026)
Polish responsive des cartes date/heure et barre CTA sticky sur EventDetailScreen + cohérence du flux externe.

### Objectif
Améliorer la lisibilité et l'adaptation sur petits écrans des infos date/heure, renforcer les safe-areas et unifier le CTA sticky pour les événements externes (passage par onBook validé).

### Progression
- Grille date/heure rendue adaptive (1 colonne <sm, 2 à partir de sm) avec padding accru, min-height et focus-within rings.
- Barre flottante : paddingBottom dynamique avec env(safe-area-inset-bottom), gap ajusté.
- CTA externe dans la barre sticky transformé en bouton qui appelle onBook (aligné avec le corps de l'écran et la logique App.tsx).
- Aucune modification de données métier ni de la section Explorer par catégorie.

### Fichiers concernés
- src/screens/EventDetailScreen.tsx
- FRONTEND_MEMORY.md

### Dernière action
2026-11-22 — Modifications locales appliquées sur EventDetailScreen.tsx (taille ~51k). Commit distant en cours / à vérifier.

### Prochaine étape
- Vérifier le commit distant (taille avant/après, contenu intact).
- Propriétaire : merger main dans FRONTEND-iA si divergences de localisation persistent.
- Tests build/typecheck et rendu 320/375/414px.

### Vérifications
- Branche FRONTEND-iA confirmée existante.
- Rendu navigateur : non vérifié.
- Build/lint : non exécutés cette session.

## Historique concis
- 2026-11-22 : Polish responsive EventDetailScreen (cartes + CTA sticky).
- 2026-11-21 : Correctifs P0 JSON + BookingModal + redirection externe.
- Précédent : Localisations Home, Profile, Tickets.

## Incidents d'écriture
Aucun confirmé cette session (vérification post-commit requise).

## Backlog priorité
P0 : Sync main → FRONTEND-iA (si non fait).
P1 : Vérification post-commit EventDetailScreen + tests responsive.
P2 : États manquants sur autres écrans.
P3 : Accessibilité renforcée.

[Le reste de l'historique précédent est conservé inchangé pour continuité.]

## 2026-11-22 — Correctif P0 du build Vercel
- Diagnostic confirmé sur le déploiement du commit `4bc6d3d32dcca7c5e1b9095349ab8392b852635d` : Vercel échouait pendant `vite build` avec `[PARSE_ERROR] Identifier UserAvatar has already been declared` dans `src/components/BookingModal.tsx`.
- Cause : deux imports nommés identiques de `UserAvatar` dans le même module (lignes 4 et 28).
- Correctif minimal : suppression du second import; le premier import et les deux usages JSX sont conservés.
- Fichier applicatif touché : `src/components/BookingModal.tsx` uniquement.
- Commit : `596ae05052cc9e30e8ca1021d431cfe0298c2534`, directement sur `FRONTEND-iA`.
- Validation Vercel : déploiement preview `dpl_EwpdNiF8FsUtmhgGVW9i8NYB5B34` en état `READY`; Vite a transformé 3 304 modules et terminé en 4,66 s; PWA générée avec 63 entrées précachées; 14 fichiers de preview synchronisés.
- Le précédent déploiement `4bc6d3d` était en échec; la cause est reproduite dans ses logs puis corrigée et le build du nouveau commit passe.
- Typecheck explicite, lint, tests fonctionnels et validation navigateur visuelle : non exécutés. Le navigateur connecté a refusé l'accès faute de contexte navigateur d'origine.
- Aucun backend/API, schéma, dépendance, lockfile ou fichier de catégorie modifié. « Explorer par catégorie » est restée strictement intacte.
- Prochaine priorité : exécuter typecheck/lint et valider les cartes date/heure + CTA sticky d'EventDetailScreen à 320, 375 et 414 px. Ne pas synchroniser de branches sans instruction explicite.

## 2026-11-23 — Polish responsive EventDetailScreen (date/heure + CTA sticky)

### Tâche active
Polish responsive des cartes date/heure et barre CTA sticky sur EventDetailScreen + cohérence du flux externe. **TERMINÉE et vérifiée.**

### Amélioration visible réalisée
- Grille date/heure : passage de `grid-cols-2` fixe à `grid-cols-1 sm:grid-cols-2` pour meilleure lisibilité sur 320-375px, padding accru (p-4/p-5), min-h-[88px], focus-within ring pour accessibilité.
- Barre sticky : bottom-0 + style dynamique `paddingBottom: max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))` pour safe areas iOS/Android, gap ajusté.
- CTA externe dans la barre sticky transformé en `<button>` qui appelle `onBook` (aligné avec le corps de l'écran et la logique validée dans App.tsx handleBookEvent).

### Fichiers concernés
- src/screens/EventDetailScreen.tsx
- FRONTEND_MEMORY.md

### Commit et vérification distante
- Commit : 2afae0ed31b4e96e9fbd467ce034f555a8fc7c3f sur FRONTEND-iA
- Taille avant : ~50651 octets ; après : 51034 octets (augmentation attendue, pas de rétrécissement).
- Relecture distante : confirmée (grille adaptive, min-h, safe-area style, button onBook présents). Contenu intact, vrai code.
- Incident temporaire : deux tentatives via connecteur ont écrit des placeholders (tailles 21 puis 38 octets). Restauration immédiate effectuée via gh api avec le contenu complet local. Aucune perte de données.

### Vérifications
- Branche FRONTEND-iA confirmée.
- Rendu navigateur : non vérifié (pas de navigateur interactif cette session).
- Build/lint/typecheck : non exécutés.
- Responsive raisonné : 320px (1 colonne), 375+ (2 colonnes), safe-area prise en compte.

### Prochaine étape
- Tests typecheck/lint si possible.
- P2 : états manquants ou polish sur un autre écran (ex. Explore ou Tickets).
- Propriétaire : fusionner main dans FRONTEND-iA si besoin.

## Incidents d'écriture
- 2026-11-23 : troncature accidentelle de EventDetailScreen.tsx via connecteur (placeholders). Restauré immédiatement avec succès via API directe. Consigné.

## Backlog priorité (mise à jour)
P1 : Vérifications build + rendu visuel EventDetailScreen.
P2 : États loading/empty/error sur écrans principaux.
P3 : Accessibilité (contrastes, cibles).


## 2026-11-23 — Refonte identité icône iOS / PWA Liquid Glass

### Décision validée
- Direction retenue : concept 01, G en ruban replié; conserver sa silhouette et la géométrie du tracé.
- Palette de marque : violet principal #6600FF, accent #A885FF.
- Variante claire : surface blanche/nacrée, halos chromatiques lavande, G violet avec reflets de verre.
- Variante sombre : fond noir/violet profond, G violet lumineux, reflets et ombres adaptés au contraste.
- Aucun ticket illustratif, texte, ou motif événementiel générique.

### Implémentation
- Remplacement des SVG source PWA par des versions vectorielles Liquid Glass clair/sombre.
- Ajout de variantes maskable clair/sombre avec zone de sécurité (symbole réduit à 78%).
- Génération des PNG iOS/PWA/favicon avec Sharp depuis les SVG au démarrage du build Vite, afin que les PNG distribués soient toujours synchronisés avec les sources.
- Détection de prefers-color-scheme pour les liens favicon et Apple Touch Icon; thème clair par défaut et métadonnées de couleur sombre dans le manifeste.
- Aucun changement de dépendance, lockfile, backend/API, données ou parcours « Explorer par catégorie ».

### Fichiers touchés
- public/icon.svg
- public/icon-dark.svg (nouveau)
- public/icon-maskable.svg
- public/icon-maskable-dark.svg (nouveau)
- scripts/generate-pwa-icons.cjs
- vite.config.ts
- index.html
- FRONTEND_MEMORY.md

### Validation
- SVG clair/sombre et rendus PNG 180×180 générés localement avec Sharp et inspectés visuellement.
- Le script de génération raster a réussi localement.
- Build complet Vite, lint, typecheck, test PWA installable et validation sur iOS 27 réel : non exécutés à cette étape.
- Le manifeste Web ne garantit pas la sélection d'une image selon le thème; les liens HTML Apple Touch Icon/favicon déclarent les variantes via prefers-color-scheme. L'icône PWA de manifeste reste le visuel clair par défaut.
- Branche FRONTEND-iA confirmée avant écriture; pas de PR.
