# FRONTEND_MEMORY.md — Mémoire de travail frontend

## Gouvernance obligatoire
- Cette mémoire est la seule mémoire de référence de l'agent frontend ChatGPT.
- Ne jamais lire, modifier, supprimer ou remplacer `PROJECT_MEMORY.md` : ce fichier appartient à un autre agent.
- Travailler sur la branche `FRONTED-iA` uniquement, sauf instruction explicite contraire.
- Ne jamais modifier `main`.
- Lire intégralement ce fichier avant chaque nouvelle session de travail et le mettre à jour à la fin avec les changements réellement effectués.
- Le code et l'état Git actuels font autorité ; vérifier avant toute modification.
- Priorité frontend : UI, UX, responsive, accessibilité, animations, cohérence visuelle, composants, navigation et performance.
- Procéder par chantiers ciblés, sans refonte massive ni suppression de fonctionnalités.
- Préserver backend, contrats API, logique métier et données.
- Ne pas modifier `package.json`, les lockfiles ou les dépendances sans autorisation explicite.
- Ne jamais exécuter `npm install`, `npm update` ou `npm audit fix`. Si l'installation devient nécessaire, utiliser uniquement `npm ci`.
- Ne jamais prétendre qu'un build, lint, typecheck, test ou contrôle visuel a réussi s'il n'a pas été exécuté.
- Ne pas fusionner dans `main` sans demande explicite.

## Projet
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`
- Branche de travail : `FRONTED-iA`
- Branche de référence : `main` (lecture comparative seulement ; aucune écriture).
- Stack visible : React 18, TypeScript, Vite, Tailwind CSS, Motion, Lucide, React Router, Supabase.
- Identité visuelle actuelle : violet (#6600FF / #8B5CF6), thème clair/sombre, surfaces Liquid Glass adaptatives.
- Scripts déclarés : `build`, `lint`, `typecheck`. Aucun script de test unitaire identifié dans package.json.
- Respecter les règles spécifiques du dépôt documentées dans `AGENTS.md`. Ne pas toucher aux prompts, services ou schémas backend dans un chantier frontend.

## État initial de cette mémoire
- À la création, aucun fichier `FRONTEND_MEMORY.md` n'existait sur `FRONTED-iA` (404 confirmé).
- La branche `FRONTED-iA` a été créée depuis `main`.
- `AGENTS.md`, `package.json`, `README.md`, `src/App.tsx`, `src/index.css`, `src/components/EventCard.tsx`, `src/components/BottomNav.tsx` et `src/components/OptimisticHeartButton.tsx` ont été consultés.
- Ne pas consulter `PROJECT_MEMORY.md`, même s'il apparaît dans la liste des fichiers du dépôt.

## Journal des interventions
- 2026-11-12 : initialisation de la mémoire dédiée sur `FRONTED-iA`. Audit ciblé de `EventCard.tsx) : la carte utilisait un `article` avec `role="button"` et `tabIndex`, tout en contenant des boutons d'action (partage et favoris), créant des contrôles interactifs imbriqués. Une classe Tailwind `min-h-[full]` est invalide. Correction ciblée prévue : déplacer l'action de découverte dans un bouton overlay frère des actions secondaires, retirer la sémantique bouton de l'article, corriger la classe de hauteur sans changer le ratio visuel.
