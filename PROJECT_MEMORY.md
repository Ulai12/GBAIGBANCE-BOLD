# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Revue complète, sécurisation et redémarrage du serveur de développement avec cœur Rust/WebAssembly universel (terminé).

## Objectif

Exécuter le moteur Rust (WebAssembly) à la fois sur le client (navigateur PWA) et sur le backend Node.js (`server.ts`) pour tous les calculs critiques : billetterie, validation cryptographique de billets QR, calculs financiers de commissions, géolocalisation Haversine & routière, et recherche floue.

## Progression

- Terminé :
  1. Quota IA `check_and_increment_ai_quota` branché sur `/api/ai/assistant/stream` et `/api/ai/generate` dans `server.ts` avec vérification de l'identité via JWT Supabase (ou digest SHA-256 de l'IP en mode invité) et renvoi de statut HTTP 429.
  2. Moteur Rust étendu et durci (`rust/gbaigbance-core/src/lib.rs`) :
     - Cryptographie pure Rust (SHA-256 & HMAC-SHA256) : comparaison en temps constant (`ct_eq`), contrôle strict des 6 segments `GBA-1:`, assainissement des `:` et découpage UTF-8 sûr sur `ticket_signature` et `verify_qr`.
     - Géolocalisation : distance Haversine + estimation distance routière (`road_distance_km`) et temps de trajet (`travel_minutes`) sur `haversine` et `nearby_events`.
     - Finances & Stocks : calcul des commissions plateformes, frais opérateurs et net organisateur en XOF (`financial_fees`) et jauge de stock (`stock`).
     - Recherche textuelle : tokenisation sur ponctuation/apostrophes/tirets + Levenshtein + suppression des diacritiques (`fuzzy_search`), et suppression du seuil `< 100` sur `coreTrendIds`.
  3. Sûreté mémoire Wasm (`src/lib/rust-core.ts`, `src/server/rustServerCore.ts`) : libération garantie des pointeurs via `try/finally` (`gba_free`) et validation JS de repli alignée.
  4. Correctifs UI & Offline :
     - `WalletPosterTicket` : signature déterministe basée sur `ticket.created_at` et vérification cryptographique des payloads `GBA-1:` via `coreVerifyQr`.
     - `ticketScannerService` : admission cryptographique hors-ligne pour les billets `GBA-1:` vérifiés par Rust avec anti-doublon `idb-keyval`.
     - `BookingModal` : aperçu transparent des frais de service (`coreFinancialFees`) et alerte de remplissage (`coreStock`).
     - `geo.ts` & `HomeScreen` : classement et distance routière de proximité propulsés par Rust (`rankNearbyEventsWithRust`).
  5. Serveur de développement (`server.ts`) : résolution automatique du port applicatif (`DEFAULT_APP_PORT` / `3000` hors conflit `NGINX_PORT=8080`), initialisation paresseuse de `GoogleGenAI` (`getAiClient()`), route `/api/events/nearby` propulsée par Rust.

## Fichiers concernés

- `rust/gbaigbance-core/src/lib.rs` & `Cargo.toml`
- `public/wasm/gbaigbance-core.wasm`
- `src/lib/rust-core.ts`
- `src/server/rustServerCore.ts`
- `server.ts`
- `src/services/ticketScannerService.ts`
- `src/components/WalletPosterTicket.tsx`
- `src/components/BookingModal.tsx`
- `src/screens/ExploreScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/EventDetailScreen.tsx`
- `src/utils/geo.ts`
- `src/features/tickets/service.ts`

## Dernière action

2026-11-13 — Revue complète, durcissement cryptographique et mémoire Wasm, intégration BookingModal/HomeScreen/scanner hors-ligne, et correction du démarrage du serveur de développement sur le port 3000.

## Vérifications

- `cargo test --manifest-path rust/gbaigbance-core/Cargo.toml` : 16 tests, 0 échec, 0 warning.
- `cargo build --target wasm32-unknown-unknown --release` : compilation Wasm réussie.
- `node --experimental-strip-types --test src/server/aiCatalog.test.ts` : 8 tests, 0 échec.
- `npm run lint` & `npm run build` : 0 erreur.
- Tests HTTP en direct sur `http://localhost:3000` (`/api/health/rust`, `/api/tickets/verify-qr`, `/api/finance/calculate-fees`, `/api/events/nearby`, `/`).

## Backlog

1. P1 — Le repli GPS de l’edge function `get_nearby_events` côté Supabase renvoie encore les premiers événements publiés sans Haversine quand le RPC échoue. Le serveur Node.js utilise déjà le moteur Rust Wasm.
2. P2 — Rappels 24 h / 2 h et alertes artistes suivis, si le service push n’est pas encore branché au démarrage de l’app.

