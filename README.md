# Gbaïgbancê — Plateforme événementielle africaine premium

Plateforme de billetterie et découverte d'événements en Afrique de l'Ouest, avec design **Liquid Glass**, support i18n (fr/en), rôles participant / organisateur / artiste, et backend Supabase.

## Fonctionnalités

- Découverte d'événements, artistes et organisateurs
- Réservation de billets avec suivi en temps réel
- Tableau de bord organisateur et création d'événements
- Assistant IA intégré (véracité stricte via outils)
- Mode Data Saver pour connexions limitées
- PWA avec notifications push
- Design Liquid Glass adaptatif + mode sombre
- Rôles et permissions (participant, organisateur, artiste)

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + Liquid Glass
- Supabase (auth, DB, realtime, edge functions)
- React Router 7
- PWA (vite-plugin-pwa)

## Démarrage

```bash
npm install
cp .env.example .env   # remplir les variables Supabase
npm run dev
```

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build de production + génération des previews
- `npm run typecheck` — vérification TypeScript
- `npm run lint` — ESLint

## Structure

- `src/screens/` — écrans principaux
- `src/components/` — composants réutilisables (Liquid Glass, modales, etc.)
- `src/features/` — logique métier (événements, billets, etc.)
- `src/services/` — clients Supabase et services
- `supabase/` — migrations et edge functions

---

*Design premium, expérience fluide, pensé pour l'Afrique.*
