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



### 2026-11-12 — P2/P3 : lisibilité et accessibilité du dock mobile
- Tâche active : améliorer le dock inférieur (BottomNav), prioritairement sur les largeurs mobiles étroites et l'accessibilité des annonces de billets.
- Objectif : augmenter la lisibilité des labels et de l'action Créer, préserver les cibles tactiles, annoncer le nombre de billets à voix accessible quand un badge est affiché.
- Progression : labels principaux 10px → 11px; dock 58px → 62px; bouton Créer 36px → 40px; label Créer 9px → 10px; aria-label dynamique inclut le compte et la pluralisation française/anglaise du badge billets.
- Fichier : `src/components/BottomNav.tsx`.
- Taille distante avant/après : 12 742 → 12 903 octets; 344 → 344 lignes (pas de réduction; contrôlé après relecture GitHub).
- Commit : `59bae5d627bcbc1b33e7d58b40b73b3050430a3d` sur `Frontend-IA`; relecture distante du fichier, contenu et métadonnées du commit confirmés.
- Build, lint, tests et vérification navigateur aux largeurs 320, 375, 414, 768, 1024, 1440px : non exécutés depuis le connecteur distant; rendu visuel non vérifié.
- Incident d'écriture : aucun observé.
- Prochaine étape : valider build/lint/tests et rendu du dock à tailles et orientation variées, vérifier la navigation avec agrandissement de texte; corriger si truncature ou débordement avéré.

## Problèmes ouverts et prochaine priorité
- Vérifier le comportement réel du thème sombre avec l'option système « Réduire la transparence » activée, notamment les surfaces GlassPanel et la navigation.
- Ensuite, poursuivre l'audit ciblé du dock de navigation sur petits écrans et tailles de texte agrandies.
- Ne considérer aucun contrôle visuel, test automatisé ou build comme réussi sans exécution effective.

## Règle de continuité
À chaque exécution, lire intégralement ce fichier avant toute intervention. Le code et l'état Git réels priment sur cette mémoire; corriger cette mémoire si elle diverge. Un seul chantier principal par session.
