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
- 2026-11-12 : initialisation de la mémoire dédiée sur `FRONTED-iA`. Audit ciblé de `EventCard.tsx` : la carte utilisait un `article` avec `role="button"` et `tabIndex`, tout en contenant des boutons d'action (partage et favoris), créant des contrôles interactifs imbriqués. La classe Tailwind `min-h-[full]` était invalide.
- 2026-11-12 : correction sur `FRONTED-iA` uniquement (`src/components/EventCard.tsx`). L'article n'est plus exposé comme bouton et ne gère plus artificiellement Enter/Espace. L'action de découverte est désormais un bouton overlay distinct, rendu seulement si `onClick` existe ; les actions partage/favori sont placées au-dessus pour rester utilisables. Suppression de `min-h-[full]`, tout en conservant les ratios `aspect-[0.78]` et `sm:aspect-[0.82]`. Vérification après écriture : `role="button"` et `min-h-[full]` absents ; structure relue via GitHub. Build, lint, typecheck et contrôle visuel non exécutés (pas d'environnement d'exécution local disponible dans cette intervention). `main` et le backend n'ont pas été modifiés.

- 2026-11-12 : amélioration ciblée de la navigation basse (`src/components/BottomNav.tsx`). Le bouton central « Créer » passe d'une cible de 36×36 px à 44×44 px, avec une icône ajustée à 20 px ; ajout d'un indicateur de focus clavier visible aux boutons de navigation et de création ; désactivation de l'animation de pulsation du badge billets et des transitions/rotations concernées lorsque `prefers-reduced-motion` est actif. Aucun changement de navigation métier ni de permission. Commit : `d381a3bf57b2a9217ba0da8fb28b092d49aee03e`. Vérification du contenu relu après écriture à effectuer ; build, lint, typecheck et validation visuelle non exécutés (pas d'environnement d'exécution navigateur/local dans cette session GitHub). Prochaine priorité : audit responsive et accessibilité du dock sur écrans étroits et grands facteurs d'échelle.
