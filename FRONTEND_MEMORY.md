# FRONTEND_MEMORY.md

## Périmètre
Mémoire du travail frontend de GBAIGBANCE-BOLD. Ne jamais lire ni modifier `PROJECT_MEMORY.md`, réservé à un autre agent.

Les branches `Frontend-IA` et `FRONTED-iA` ont été fusionnées le 2026-11-13 dans `Frontend-IA` (PR #6 vers `main`). Cette branche contient désormais le dock mobile, le verre sombre à transparence réduite, l'explorateur de catégories et les correctifs stats/analytics.

## Gouvernance
- Lire ce fichier avant chaque session et le mettre à jour avec les changements réellement effectués.
- Le code et l'état Git font autorité si cette mémoire diverge.
- Priorité : UI, UX, responsive, accessibilité, animations, navigation et performance.
- Ne pas modifier `package.json`, les lockfiles ou les dépendances sans demande explicite.
- Ne jamais prétendre qu'un build, lint, typecheck, test ou contrôle visuel a réussi s'il n'a pas été exécuté.
- Ne pas fusionner dans `main` sans demande explicite.

## Projet
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`
- Branche fusionnée : `Frontend-IA` (base de la PR #6)
- Branche absorbée : `FRONTED-iA`
- Stack : React 18, TypeScript, Vite, Tailwind CSS, Motion, Lucide, React Router, Supabase.
- Identité : violet (#6600FF / #8B5CF6), thème clair/sombre, Liquid Glass.

## Journal

### 2026-11-12 — Frontend-IA : verre sombre et dock
- `prefers-reduced-transparency` : surcharge `.dark` dans `src/index.css` pour garder des surfaces sombres. Commit `8b7b1d6` sur `main`.
- Dock mobile (`src/components/BottomNav.tsx`) : labels 11px, dock 62px, aria-label du badge billets avec pluralisation fr/en. Commit `59bae5d` sur `Frontend-IA`.
- Validation navigateur (320, 375, 414, 768, 1024, 1440) et build/lint : non exécutés dans la session distante. PR #6 ouverte, non fusionnée dans `main`.

### 2026-11-12 — FRONTED-iA : cartes, catégories, stats
- `EventCard.tsx` : plus de bouton imbriqué dans un `article role="button"` ; overlay de découverte distinct ; suppression de `min-h-[full]`.
- `BottomNav.tsx` : bouton Créer 44×44 px, focus clavier, `prefers-reduced-motion`. Commit `d381a3b`.
- Explorateur de catégories : hiérarchie parent/sous-catégorie, catalogue publié complet, plus de flicker ni de polling.
- Stats/analytics : historique organisateur par mois, pas d'échantillon partiel, repli JavaScript typé, billets uniques.
- Build de preview frontend consigné comme réussi dans les commits de la branche ; pas rejoué lors de la fusion.

### 2026-11-13 — Fusion `FRONTED-iA` → `Frontend-IA`
- Ancêtre commun : `75a06f1`.
- Conflits résolus :
  - `src/components/BottomNav.tsx` : bouton Créer conservé à 44×44 px avec anneau de focus et `motion-reduce` (FRONTED-iA), en gardant les labels 11px, le dock 62px, le badge accessible et le `GlassPanel` déjà fusionnés automatiquement.
  - `FRONTEND_MEMORY.md` : les deux journaux sont réunis ici.
- `main` n'a pas été modifié.

## Ouvert
- Contrôle visuel du dock et du thème sombre « réduire la transparence » toujours à faire aux largeurs 320–1440.
- Build, lint et typecheck de la fusion non exécutés tant qu'ils ne sont pas lancés.


### 2026-11-13 — Explorateur : catégories privées et chips horizontales
- `src/screens/HomeScreen.tsx`: cartes de catégorie réduites (hauteur minimum 104px → 76px, icône 18px, libellé 11px) pour rendre la grille mobile plus équilibrée.
- Les sous-catégories sont désormais des chips compactes défilables horizontalement dans la barre de sélection des résultats, alignées sur la même rangée que le bouton « Fermer ».
- `src/constants/categories.ts`: la catégorie parent « Privé & Célébrations » est conservée et sa taxonomie enrichie en Mariages, Anniversaires, Cérémonies familiales, VIP privés et Célébrations.
- Inspection Supabase : la table `public.events` ne possède pas de colonnes dédiées `main_category` / `subcategory`; l'architecture actuelle expose l'enrichissement via les métadonnées de description. Aucune migration ni mutation de base n'a été faite.
- Commit UI `7ed5cbc`; commit taxonomie `67a5049`. Build, lint, typecheck et contrôle visuel navigateur non exécutés dans cette session.
