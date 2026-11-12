# CHATGPT Frontend Memory

## Cadre de continuité
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Mémoire dédiée exclusive à ChatGPT. Ne jamais lire, modifier, supprimer ou remplacer `PROJECT_MEMORY.md`.
- Branche de travail : `FRONTED-iA` (branche distincte de `main`).
- Stack observée : React 18, TypeScript, Vite, Tailwind CSS, React Router, Motion.
- En cas de divergence, le code et Git font autorité.

## Historique
- 2026-11-12 — Initialisation de cette mémoire sur `FRONTED-iA`.
- 2026-11-12 — Correctif P1 du checkout multi-billets dans `src/components/BookingModal.tsx` : le changement de destinataire conserve un tableau aligné sur la quantité choisie ; les ajouts de quantité créent des bénéficiaires distincts ; garde-fou avant achat pour normaliser le nombre de destinataires ; synchronisation du premier nom cadeau.
  - Impact visé : empêcher une divergence entre montant affiché et nombre de billets créés.
  - Vérification statique : cohérence avec `purchaseTicketsMulti`, qui calcule le montant et génère les billets depuis `recipients.length`.
- 2026-11-12 — Correctif P0 du build dans `src/components/EventCard.tsx` : fermeture manquante du conteneur « CONTENT LAYER » avant le bouton de superposition. L'erreur JSX a été signalée par le build Vercel de la branche.
  - Le fichier était inchangé par le correctif de réservation ; la compilation était bloquée par cette erreur de structure JSX déjà présente sur la branche.
  - Commit distinct pour isoler le déblocage du build.
- Aucun fichier backend, Supabase, API, lockfile ou configuration de dépendances modifié.

## État courant
- Chantiers : cohérence quantité / destinataires dans la réservation ; correction de la fermeture JSX bloquant la compilation.
- Vérifications : contrôle statique des deux modifications. Build, typecheck, lint et tests locaux non exécutés dans cette session. Le nouveau déploiement Vercel doit confirmer le build après le correctif JSX.
- Validation visuelle navigateur / responsive non effectuée.
- Problèmes ouverts : parcours invité à auditer séparément ; ergonomie générale de la modale de réservation à évaluer.
- Prochaine priorité recommandée : vérifier le build et auditer l'accès invité à la réservation et la récupération des billets sans modifier le backend sans preuve de nécessité.
