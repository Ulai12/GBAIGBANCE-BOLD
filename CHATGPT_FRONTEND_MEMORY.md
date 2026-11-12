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
- 2026-11-12 — Correctif P0 du build dans `src/components/EventCard.tsx` : fermeture manquante du conteneur « CONTENT LAYER » avant le bouton de superposition. Le fichier était inchangé par le correctif réservation ; l'erreur JSX a été signalée par Vercel.
- 2026-11-12 — Audit P1 du parcours invité : constat confirmé, le CTA de la page détail ouvrait directement sa modale locale sans utiliser le garde d'authentification global. Le service traite `guest-*` en mode local de démonstration au lieu d'appeler la RPC Supabase ; les billets ne constituent donc pas des commandes serveur réelles. Décision : ne pas ouvrir une réservation invitée tant que le backend ne la prend pas explicitement en charge.
- 2026-11-12 — Correction du parcours d'accès à la réservation : les CTA de la page détail et la sélection d'une catégorie de billet délèguent désormais au gestionnaire global `onBook`. Celui-ci impose une session, transmet l'option choisie à la modale globale et conserve l'intention de réservation (événement + option) pendant la connexion ou l'inscription ; après authentification, la modale globale reprend automatiquement le parcours. Suppression de la modale locale concurrente de la page détail.
  - Fichiers fonctionnels : `src/App.tsx`, `src/screens/EventDetailScreen.tsx`, `src/navigation/RouteWrappers.tsx` (contrat de callback option de billet).
  - Impact visé : empêcher la création locale d'un faux succès de réservation pour les visiteurs non connectés ; un utilisateur authentifié passe par un seul flux de réservation.
- Correctif JSX précédent : `src/components/EventCard.tsx`. Aucun fichier backend, Supabase, API, lockfile ou configuration de dépendances modifié pendant les chantiers UI.
 
## État courant
- Vérifications : Vercel a confirmé READY pour le correctif de garde d'authentification précédent (commit `bf47f09`). Le build de cette amélioration de reprise automatique doit encore être confirmé. Typecheck, lint, tests locaux et validation visuelle responsive non exécutés.
- Problèmes ouverts : la réservation sans compte n'est pas prise en charge par le service de production ; il faudra concevoir un vrai flux invité serveur (identité, paiement, attribution et récupération) avant de l'activer.
- Prochaine priorité : vérifier le déploiement du correctif de garde d'authentification, puis tester le retour depuis connexion vers le détail d'événement et le passage authentifié à la réservation.
