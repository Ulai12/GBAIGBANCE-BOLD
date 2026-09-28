---
trigger: always_on
---

# RÈGLES OBLIGATOIRES AVANT TOUTE MODIFICATION DU CODE

Lis ce document en entier avant de toucher au moindre fichier.

## 2. Composants système
- Réutilise TOUJOURS les composants déjà présents dans le projet
  avant d'en créer un nouveau.
- Sinon, utilise les éléments HTML natifs et sémantiques
  (button, input, dialog, nav...) plutôt que des div bricolées.
- Ne recrée jamais un composant qui existe déjà.

## 3. Design system : style Apple
- Respecte toujours le design system existant, inspiré des
  Apple Human Interface Guidelines.
- Police système (`-apple-system`, SF Pro), hiérarchie
  typographique claire.
- Espacements sur une grille de 8 px, coins arrondis cohérents.
- Couleurs sémantiques (pas de valeurs codées en dur si des
  variables/tokens existent), dark mode pris en charge.
- Cibles tactiles d'au moins 44 px.
- Animations douces et discrètes (type ressort), jamais
  agressives.
- Ne mélange jamais un autre style visuel (Material, etc.).

## 4. Méthode de travail
- Lis les fichiers concernés et le code voisin avant de modifier.
- Fais des modifications minimales et ciblées : pas de
  refactoring ni de renommage non demandé.
- Ne supprime aucune fonctionnalité existante.
- TypeScript strict : pas de `any`, types explicites.
- Commente systématiquement le code modifié pour expliquer
  ce qui a changé et pourquoi.
- En cas de doute ou d'ambiguïté : pose la question avant d'agir.
