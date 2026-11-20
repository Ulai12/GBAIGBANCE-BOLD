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

## Intervention du 20 novembre 2026 — Event Creation Studio
### Objectif
Finaliser le parcours de création d'événement, en priorité le débordement mobile date/heure et l'erreur Supabase `access_type` visible dans les captures utilisateur.

### Constat vérifié
- Le wizard `src/screens/CreateEventWizardScreen.tsx` comporte neuf étapes : Infos, Lieu & Dates, Photos, Billets, Collaborateurs, Programme, Live, Sponsors, Confirmation.
- La mutation de création est dans `src/features/events/mutations.ts` et envoie `access_type`, `external_ticket_url`, `whatsapp_number`, `whatsapp_message`, `video_url` et `unlimited_capacity` dans `public.events`.
- Le client Supabase `src/infrastructure/supabase/client.ts` utilise par défaut le projet `lwwiolbofrqakvrdvbbj`, avec prise en compte des variables d'environnement.
- Supabase MCP a confirmé que `public.events.access_type` existe et que la migration `event_access_type_external_ticketing_v1` est enregistrée dans l'historique du projet.
- Les colonnes associées `external_ticket_url`, `whatsapp_number`, `whatsapp_message`, `video_url` et `unlimited_capacity` existent également.
- Une notification `NOTIFY pgrst, 'reload schema'` a été exécutée sur le projet; la requête SQL de vérification a retourné les six colonnes attendues. Aucun DDL ni changement de schéma n'a été effectué.
- Le message d'erreur capturé ne correspond donc pas à une colonne absente de la base actuellement connectée. Si l'erreur persiste, vérifier que le déploiement et ses variables Vercel ciblent le même projet Supabase et examiner le cache/API au moment de la requête.

### Modifications effectuées
- `src/screens/CreateEventWizardScreen.tsx` :
  - Ajout de `getLocalDateInputValue()` pour générer les valeurs des champs date depuis le calendrier local plutôt qu'en tronquant une date ISO UTC.
  - Champs date/heure renforcés contre les débordements natifs mobile avec largeur/max-width/min-width explicites, `appearance-none` et padding compact.
  - Grilles date/heure sécurisées avec deux pistes `minmax(0, 1fr)` et débordement contenu.
  - En-tête de la carte Dates et heures autorisé à passer sur plusieurs lignes; badge de date limité et enveloppant.
- Commit code : `c8c29620a1f8cc3b52707fd0a6af632214c56a80`.

### Tests et limites
- Vérification GitHub : écriture effectuée sur `FRONTEND-iA`; HEAD constaté après commit code : `c8c29620a1f8cc3b52707fd0a6af632214c56a80`.
- Vérification Supabase : colonnes confirmées par `list_tables` et requête `information_schema.columns`; cache PostgREST rechargé via notification.
- Pas de build, typecheck, lint ni test navigateur exécuté dans cette session à ce stade.
- Pas de validation visuelle réelle sur iPhone après modification.
- Aucune modification backend, migration, PR ou changement sur une autre branche.
- La page « Explorer par catégorie » n'a pas été modifiée.

### Prochaine priorité
1. Vérifier le déploiement Vercel associé au commit `c8c2962` sur `FRONTEND-iA`.
2. Tester sur iPhone la saisie début/fin et vérifier l'absence de débordement.
3. Refaire une publication de test avec chaque mode d'accès (billetterie native, gratuit, WhatsApp, externe) et contrôler les erreurs éventuelles.
4. Si `access_type` échoue encore, confirmer la valeur réelle de `VITE_SUPABASE_URL` et les variables du déploiement Preview/Production sans exposer de clés, puis contrôler la réponse PostgREST.
5. Continuer l'audit du flux complet : sauvegardes optionnelles, statut réel après invitations, aperçu fidèle, erreurs accessibles et traductions FR/EN.

## Protection de la section Explorer
La section « Explorer par catégorie » est déclarée intouchable par l'utilisateur. Aucun ajustement de layout, CSS, responsive, animation, libellé, icône, hiérarchie, donnée ou interaction ne doit y être effectué sans demande explicite.


## Intervention du 20 novembre 2026 — Harmonisation du shell Event Creation Studio

### Modifications préparées sur FRONTEND-iA
- En-tête du wizard : présentation resserrée en panneau flottant à surface vitrée, alignement avec la hiérarchie des pages (eyebrow, titre fort, progression), sans modifier le contenu ni la logique des neuf étapes.
- Barre d'actions : regroupement des commandes dans une capsule flottante centrée, avec deux boutons individuels en pilule, contraste clair/sombre, ombre douce et respect de la zone de sécurité iOS.
- Les actions Retour, Continuer, Publier et Annuler conservent leurs callbacks et leurs conditions d'affichage.
- Aucun changement des catégories, de leur hiérarchie, des données, du backend ou des contrats Supabase.

### Vérifications
- Branche ciblée avant préparation : FRONTEND-iA; HEAD observé : `f9d5ecb524571828554acd3915bee790b41185d4`.
- Patch appliqué avec garde-fous : chacune des six substitutions attendues a été trouvée exactement une fois.
- Validation build/typecheck, navigateur et responsive réelle : non exécutée à ce stade.
- Aucun commit ni PR créé dans cette étape de préparation.

### Suite
- Vérifier le rendu sur mobile et desktop, notamment le panneau sticky, la capsule d'actions, les thèmes clair/sombre et les libellés longs FR/EN.
- Exécuter build/typecheck/lint disponibles avant publication du commit.


### Résultat de validation Vercel — commit afd61e3
- Déploiement Preview créé sur FRONTEND-iA : `dpl_Wi1PBUJrBr8TLEnjjTE2sSQu71Xj`.
- État final : ERROR. La commande `bun run build` échoue pendant la transformation Vite, avec deux erreurs du plugin `builtin:vite-json` : `expected value at line 1 column 1`.
- Les logs montrent aussi un avertissement PWA : le motif de précache ne trouve aucun fichier correspondant. Le build n'est donc pas validé.
- L'erreur de build n'indique pas de fichier JSON fautif dans les extraits disponibles; sa cause exacte reste à isoler. Ne pas l'attribuer au patch de classes Tailwind sans preuve.
- La prévisualisation de ce commit n'est pas considérée publiable. La vérification visuelle n'a pas pu être faite.
- Prochaine action P0 : isoler les deux erreurs Vite JSON du build sur FRONTEND-iA sans modifier les lockfiles ni les catégories. Ensuite relancer le build et contrôler le rendu mobile.
