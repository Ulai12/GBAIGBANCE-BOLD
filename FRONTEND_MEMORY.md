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

## Tâche active (23 novembre 2026)
Localisation et polish UI de OrganizerDashboardScreen (FR/EN + en-tête cohérent).

### Objectif
Rendre l'écran dashboard organisateur bilingue et visuellement aligné avec les autres écrans principaux (eyebrow, hiérarchie).

### Progression
- Clés organizerDashboard préparées pour fr/en/events.json.
- Remplacements t() et polish header préparés localement.
- Push distant a échoué par troncature (fichier réduit ~33k → ~20k, modals manquants).

### Fichiers concernés
- src/screens/OrganizerDashboardScreen.tsx (tronqué, à restaurer)
- src/locales/fr/events.json (non vérifié)
- src/locales/en/events.json (non vérifié)
- FRONTEND_MEMORY.md

### Dernière action
2026-11-23 — Tentative de localisation. Incident de troncature constaté. Restauration requise depuis 8ce468fdf13e794d781188a05d3924f8e8ab0ac2.

### Prochaine étape
- Restaurer OrganizerDashboardScreen.tsx depuis le commit sain.
- Réappliquer la localisation par petits commits ou API directe.
- Vérifier tailles avant/après et contenu complet.

### Vérifications
- Branche FRONTEND-iA confirmée.
- Rendu / build : non vérifiés.
- Fichier distant actuellement incomplet (non vérifié comme sain).

## Incidents d'écriture
- 2026-11-23 : troncature de OrganizerDashboardScreen.tsx lors des pushes (placeholders et contenu partiel). Commits 3c66998, a9a5006, 596c91e. Restauration immédiate non complète à cause de la taille des arguments. Fichier à restaurer depuis 8ce468fd.

## Backlog priorité
P0 : Restaurer OrganizerDashboardScreen.tsx (tronqué).
P1 : Finir localisation dashboard + vérifications.
P2 : États manquants sur autres écrans.

[Historique précédent conservé inchangé pour continuité.]

## 2026-11-23 — Incident troncature OrganizerDashboardScreen
Fichier réduit et incomplet après tentatives de push de la version localisée. Contenu sain disponible dans le commit 8ce468fdf13e794d781188a05d3924f8e8ab0ac2. Version localisée préparée localement (clés + t() + eyebrow). Prochaine session : restauration puis réapplication.
