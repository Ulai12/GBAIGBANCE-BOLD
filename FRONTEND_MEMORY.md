# FRONTEND_MEMORY.md

## Périmètre
Mémoire indépendante du travail frontend de ChatGPT pour GBAIGBANCE-BOLD. Ne jamais lire ni modifier `PROJECT_MEMORY.md`, réservé à un autre agent.

## État initial vérifié
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Branche par défaut observée : `main`; permissions GitHub retournées : lecture/écriture.
- Stack observée dans `package.json` : React 18, TypeScript, Vite, Tailwind CSS.
- Styles globaux : `src/index.css`; thèmes clair/sombre et tokens Liquid Glass.
- Ce fichier était absent lors de la première intervention du 2026-11-12.

## Historique des interventions

### 2026-11-12 — P2 : transparence réduite en thème sombre
- Diagnostic : dans `src/index.css`, la règle `@media (prefers-reduced-transparency: reduce)` définissait des tokens de verre clairs sur `:root`, sans rétablir des valeurs sombres sous `.dark`. Les surfaces utilisant ces tokens pouvaient donc devenir trop claires en thème sombre.
- Correction : ajout d'une surcharge `.dark` dans cette media query pour conserver une teinte sombre opaque et des bordures/reflets discrets.
- Fichier modifié : `src/index.css`.
- Commit : `8b7b1d6a898a694a61697c863d60d816d25a5507` sur `main`.
- Vérification effectuée : relecture du fichier depuis GitHub et confirmation de présence du bloc ajouté.
- Tests build/typecheck/lint : non exécutés dans cette intervention distante.
- Validation visuelle et responsive navigateur : non exécutée; aucun rendu/capture n'a été vérifié.

## Problèmes ouverts et prochaine priorité
- Vérifier le comportement réel du thème sombre avec l'option système « Réduire la transparence » activée, notamment les surfaces GlassPanel et la navigation.
- Ensuite, poursuivre l'audit ciblé du dock de navigation sur petits écrans et tailles de texte agrandies.
- Ne considérer aucun contrôle visuel, test automatisé ou build comme réussi sans exécution effective.

## Règle de continuité
À chaque exécution, lire intégralement ce fichier avant toute intervention. Le code et l'état Git réels priment sur cette mémoire; corriger cette mémoire si elle diverge. Un seul chantier principal par session.
