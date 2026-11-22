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