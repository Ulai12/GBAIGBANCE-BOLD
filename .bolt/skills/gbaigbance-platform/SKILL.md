---
name: gbaigbance-platform
description: Conventions et architecture pour la plateforme événementielle africaine Gbaigbance. Utiliser à chaque fois qu'on construit, modifie ou étend une application événementielle de type Eventbrite/Airbnb premium avec design Liquid Glass, i18n fr/en, rôles participant/organisateur/artiste, et backend Supabase. Déclenche sur les requêtes mentionnant Gbaigbance, "plateforme événementielle", "design Apple/iOS premium", "Liquid Glass", ou "application événementielle africaine".
---

# Gbaigbance Platform

Plateforme événementielle africaine premium (Togo, Bénin, Afrique francophone) permettant de découvrir, organiser et participer à des événements. Inspirée des standards Apple, Airbnb, Eventbrite et Spotify, adaptée au contexte africain.

## Architecture

Frontend web (React + Vite + TypeScript + Tailwind) avec backend Supabase (PostgreSQL + Auth + Storage). La structure projet suit une séparation par responsabilité :

```
src/
  components/      # Composants réutilisables (GlassCard, EventCard, BottomNav...)
  features/        # Logique métier par domaine (events, artists, auth...)
  screens/         # Écrans complets (Home, Explore, EventDetail, Profile...)
  services/        # Clients API (supabase, etc.)
  hooks/           # Hooks React personnalisés
  utils/           # Utilitaires (formatage, dates, devise)
  constants/       # Catégories, couleurs, config
  locales/         # Traductions fr/en séparées par domaine
  types/           # Types TypeScript partagés
  security/        # RBAC, validation, sanitization
```

## Design System — Liquid Glass Violet

L'esthétique est "Liquid Glass" avec une palette violette/lavande premium (le violet est explicitement demandé par l'utilisateur pour ce projet) :

- **Primary** : violet brand (#6600FF)
- **Light BG** : lavande (#EDE8FF)
- **Card** : blanc (#FFFFFF) avec ombres violettes légères
- **Dark Card** : (#1A1A2E) pour les cartes "trending" en contraste
- **Glass Ticket** : dégradé violet avec backdrop-blur pour les billets

Composants obligatoires : `GlassCard`/`card`, `GlassButton`/`btn-purple`, `BottomNav` (pill style), `SearchBar`, `EventCard`, `ArtistCard`, `OrganizerCard`, `ProfileHeader`, `BottomSheet`, `Modal`, `Toast`, `Skeleton`, `EmptyState`.

BottomNav : 5 onglets (Home, Explore, Tickets, Favorites, Profile) avec pill violet actif. Responsive mobile-first.

## Internationalisation

Français par défaut, anglais disponible. Aucun texte en dur dans les composants — tout passe par le hook `useTranslation()` qui lit `src/locales/{lang}/{domain}.json`. Préparer Yoruba, Ewe, Fon pour plus tard (structure prête, traductions à venir).

## Rôles et RBAC

Quatre rôles : `participant`, `organizer`, `artist`, `admin`. Le rôle est stocké dans `profiles.role`. Les politiques RLS Supabase font respecter les permissions :

- Participant : lire événements, réserver, suivre artistes
- Organisateur : CRUD sur ses événements uniquement
- Artiste : éditer son profil artistique
- Admin : modération complète (via service role, pas exposé côté client)

## Schéma base de données

Tables : `profiles`, `organizations`, `artists`, `events`, `event_artists`, `tickets`, `event_likes`, `artist_follows`. RLS activé partout. Lecture publique sur events/artists/organizations ; écriture authentifiée propriétaire.

## Règles de qualité

- TypeScript strict mode, pas de `any` implicite
- Composants réutilisables, pas de duplication
- Valider les entrées utilisateur aux frontières (formulaires, API)
- Gérer explicitement les états de chargement, d'erreur et vide
- Images depuis Pexels (stock photos) en placeholders
- Icônes depuis lucide-react uniquement
