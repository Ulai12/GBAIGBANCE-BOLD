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
