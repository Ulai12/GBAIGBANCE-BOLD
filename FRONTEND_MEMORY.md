# FRONTEND_MEMORY.md — Mémoire frontend

## Règles permanentes
- Branche Git unique : `FRONTEND-iA`.
- Après chaque commit : relecture distante + tailles. Rétrécissement >20 % non voulu → ARRÊT + restauration.
- Fichiers >25 ko : risque de troncature via connecteur ; préférer git local / API complète.

## Projet
- Dépôt : https://github.com/Ulai12/GBAIGBANCE-BOLD
- Branche : `FRONTEND-iA`
- Stack : React 18, TypeScript, Vite, Tailwind, Supabase `lwwiolbofrqakvrdvbbj`.

## Tâche active (23 novembre 2026) — BLOQUÉE P0
**Restauration `src/locales/fr/events.json` et `src/locales/en/events.json`**

### État critique
- Les deux fichiers sont **vides ou partiels** (incident PLACEHOLDER puis push vide, puis restore partiel FR ~17 ko au lieu de ~42 ko).
- Commit sain de référence : **`8ce468fdf13e794d781188a05d3924f8e8ab0ac2`**
- Contenu sain disponible aussi en local agent : tailles FR 42190 / EN 37952 octets.

### Action REQUISE (propriétaire ou agent avec git local)
```bash
git fetch origin
git checkout FRONTEND-iA
git checkout 8ce468fdf13e794d781188a05d3924f8e8ab0ac2 -- src/locales/fr/events.json src/locales/en/events.json
git status  # vérifier tailles ~42k / ~38k
git commit -m "fix(P0): restore fr/en events.json from healthy 8ce468fd"
git push origin FRONTEND-iA
```

### Ne pas continuer
- Ne pas ajouter de clés organizerDashboard tant que les JSON complets ne sont pas restaurés.
- Ne pas pousser de contenu partiel.

### Déjà fait cette session
- OrganizerDashboardScreen.tsx restauré (`e4e30a08`) — logique complète OK.
- FRONTEND_MEMORY mis à jour.

### Prochaine étape après restore events.json
- Vérifier tailles distantes FR≈42k EN≈38k.
- Puis localisation progressive OrganizerDashboard par **petits commits**.

## Incidents
- 2026-11-23 : events.json → PLACEHOLDER puis size 0 (commit 50da5d77) puis FR partiel 17k (a3c74da8). **Non résolu par connecteur (limite taille payload).**

## Backlog
P0 : Restaurer events.json FR/EN complets (commande ci-dessus).
P1 : i18n OrganizerDashboard (petits commits).
P2 : États loading/empty.
