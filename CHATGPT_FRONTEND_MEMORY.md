# CHATGPT Frontend Memory

## Cadre de continuité
- Dépôt : `Ulai12/GBAIGBANCE-BOLD`.
- Mémoire dédiée exclusive à ChatGPT. Ne jamais lire, modifier, supprimer ou remplacer `PROJECT_MEMORY.md`.
- Branche de travail : `FRONTED-iA` (branche distincte de `main`).
- Stack observée : React 18, TypeScript, Vite, Tailwind CSS, React Router, Motion.
- En cas de divergence, le code et Git font autorité.

## Historique
- 2026-11-12 — Initialisation de cette mémoire sur `FRONTED-iA`.
- 2026-11-12 — Correctif P1 du checkout multi-billets : le changement de destinataire conserve maintenant un tableau aligné sur la quantité choisie ; les ajouts de quantité créent des bénéficiaires supplémentaires distincts ; garde-fou avant achat pour normaliser le nombre de destinataires. Synchronisation du champ du premier bénéficiaire avec le nom du cadeau.
  - Fichier fonctionnel : `src/components/BookingModal.tsx`.
  - Impact visé : empêcher que le total affiché et le nombre de billets créés divergent après bascule « Pour moi / Offrir à un ami ».
  - Vérifications : revue statique du flux et cohérence avec `purchaseTicketsMulti`, qui calcule le montant et génère les billets depuis `recipients.length`. Build, typecheck, lint et tests automatisés non exécutés dans cette session ; validation visuelle navigateur non effectuée.
  - Aucun fichier backend, Supabase, API, lockfile ou configuration de dépendances modifié.

## État courant
- Chantier terminé : cohérence quantité / destinataires dans la modale de réservation.
- Problèmes ouverts : parcours invité à auditer séparément ; ergonomie générale de la modale de réservation à évaluer.
- Prochaine priorité recommandée : vérifier de bout en bout l'accès invité à la réservation et la récupération des billets, sans modifier le backend sans preuve de nécessité.
