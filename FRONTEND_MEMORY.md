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
