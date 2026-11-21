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
Chantier prioritaire de cette session : rééquilibrage responsive du parcours « Explorer par catégorie » sur l'accueil, explicitement demandé pour cette intervention. La règle de protection habituelle de cette section reste valable après ce chantier, sauf nouvelle demande explicite.

### Diagnostic confirmé
- Parcours rendu dans `src/screens/HomeScreen.tsx`, section 2; hiérarchie métier définie dans `src/constants/categories.ts` : 6 catégories parentes et 18 sous-catégories.
- Les cartes parentes étaient verticales sous le breakpoint `sm`, avec `min-h-12` et un empilement icône/libellé qui augmentait leur hauteur sur les téléphones.
- Les sous-catégories utilisaient `flex-wrap` et `whitespace-normal` à toutes les largeurs; les libellés français/anglais jusqu'à 23 caractères pouvaient se réduire en petites puces et créer des hauteurs irrégulières.
- Les données, traductions, IDs, ordre, icônes, sélection et filtrage sont séparés de cette présentation et n'ont pas besoin d'être changés.

### Correctif P0 préalable
- Déploiement du HEAD précédent bloqué par une virgule manquante dans `src/locales/fr/events.json:803`, confirmée par les logs Vercel (`builtin:vite-json`, ligne 804).
- Virgule restaurée après `home.seeMore`; JSON français et anglais validés avec `JSON.parse`.
- Commit : `ff9e0b9b97de990a6c85642cbc5adef43a00eac2`.
- Prévisualisation Vercel : `READY`, 3 304 modules transformés, build Vite 4,57 s, génération PWA et 14 fichiers preview synchronisés.

### Intervention UI en cours
- Extraction de la tuile parente dans `src/components/CategoryTile.tsx` pour centraliser états actif/inactif, focus clavier et proportions.
- Tuiles parentes : cible minimale 44 px, présentation verticale conservée sous 380 px, disposition horizontale à partir de 380 px; libellés intacts, retour à la ligne naturel, sans hauteur fixe.
- Sous-catégories : défilement horizontal sans wrapping sur mobile pour éviter les puces hautes et étroites; retour à la ligne à partir de `sm`; cibles tactiles conservées à 44 px.
- Grille métier conservée à 2/3/6 colonnes et breakpoints existants; aucune modification des données, de la logique de sélection, du backend ou des API.

### Fichiers
- `src/components/CategoryTile.tsx`
- `src/screens/HomeScreen.tsx`
- `src/locales/fr/events.json` (correctif P0 préalable)
- `FRONTEND_MEMORY.md`

### Vérifications et limites
- Branche cible confirmée : `FRONTEND-iA`; HEAD de départ UI : `ff9e0b9b97de990a6c85642cbc5adef43a00eac2`.
- Build Vercel du correctif P0 : `READY`; build UI de cette intervention à lancer après push.
- `JSON.parse` FR/EN : PASS.
- Typecheck, lint et tests dédiés : non exécutés localement.
- Validation navigateur/captures réelles : non réalisée, le navigateur connecté n'est pas accessible dans ce contexte.
- UIAudit et Superdesign : outils/workflows non exposés dans l'environnement courant; aucun audit ni draft revendiqué.
- Aucun changement backend/API, aucun PR, aucun changement de branche secondaire.

### Prochaine étape
- Vérifier le build Vercel du commit UI puis effectuer un contrôle réel sur téléphone étroit, iPhone 11/large mobile, tablette et desktop dès qu'un navigateur de test est accessible.
- Reprendre ensuite le polish responsive d'EventDetailScreen sans synchronisation vers une autre branche.

## Historique concis
- 2026-11-21 : Correctifs P0 JSON + BookingModal. Constat avance main.
- 2026-11-20 : Fixes date/heure wizard + shell Event Creation Studio.
- Précédent : Localisations Home, Profile, Tickets.

## Incidents d'écriture
Aucun cette session.

## Backlog priorité
P1 : Polish responsive EventDetailScreen (info cards, sticky CTA, safe areas), uniquement sur FRONTEND-iA.
P2 : États manquants (chargement, vide, erreur) sur écrans clés.
P3 : Accessibilité (contrastes, cibles 44px) et validation visuelle mobile/tablette/desktop.


## 2026-11-21 — Blocage P0 du build Vercel
- Diagnostic confirmé sur le déploiement Vercel du HEAD `14a3066e2f76c7b64e909af17676790968e74b85` : `builtin:vite-json`, erreur `expected ',' or '}' at line 804 column 5`.
- Cause exacte : virgule manquante après la clé `home.seeMore` dans `src/locales/fr/events.json`, juste avant l'objet `seeMore`.
- Correctif minimal : ajout de cette virgule uniquement; aucun libellé, donnée ou clé métier modifié.
- Validation locale de contenu : `JSON.parse` passe après correction; le catalogue anglais passait déjà.
- Fichier modifié : `src/locales/fr/events.json`.
- À vérifier : nouveau build Vercel après push. Typecheck, lint et rendu navigateur non exécutés à ce stade.
