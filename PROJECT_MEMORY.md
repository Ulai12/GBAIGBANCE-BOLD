# PROJECT_MEMORY

Mémoire de travail de GBAIGBANCE-BOLD. À lire en début de session, à mettre à jour en fin de session.

## Tâche active

Extension et déploiement universel du cœur Rust/WebAssembly sur tous les modules métier critiques (terminé).

## Objectif

Exécuter le moteur Rust (WebAssembly) à la fois sur le client (navigateur PWA) et sur le backend Node.js (`server.ts`) pour tous les calculs critiques : billetterie, validation cryptographique de billets QR, calculs financiers de commissions, géolocalisation Haversine, et recherche floue.

## Progression

- Terminé :
  1. Quota IA `check_and_increment_ai_quota` branché sur `/api/ai/assistant/stream` et `/api/ai/generate` dans `server.ts` avec vérification de l'identité via JWT Supabase (ou digest SHA-256 de l'IP en mode invité) et renvoi de statut HTTP 429.
  2. Moteur Rust étendu (`rust/gbaigbance-core/src/lib.rs`) avec :
     - Cryptographie sans dépendance externe : SHA-256 et HMAC-SHA256, signature déterministe de billets et contrôle anti-contrefaçon de QR codes (`ticket_signature`, `verify_qr`).
     - Géolocalisation : distance Haversine précise et filtrage par rayon kilométrique (`haversine`, `nearby_events`).
     - Finances : calcul des commissions plateformes et reversements organisateur Mobile Money/Carte en XOF (`financial_fees`).
     - Recherche textuelle : tolérance aux fautes de frappe par distance de Levenshtein et suppression complète des diacritiques (`fuzzy_search`).
  3. Tests unitaires Rust : 13/13 tests validés avec succès (`cargo test`).
  4. Compilation WebAssembly : `public/wasm/gbaigbance-core.wasm` compilé et optimisé.
  5. Pont client (`src/lib/rust-core.ts`) et serveur Node.js (`src/server/rustServerCore.ts`, `server.ts`) branchés avec fallbacks gracieux.
  6. Intégration UI : scanner de billets (`TicketScannerModal`), pass d'entrée signé numériquement (`WalletPosterTicket`), et exploration (`ExploreScreen`).

## Fichiers concernés

- `rust/gbaigbance-core/src/lib.rs` & `Cargo.toml`
- `public/wasm/gbaigbance-core.wasm`
- `src/lib/rust-core.ts`
- `src/server/rustServerCore.ts`
- `server.ts`
- `src/services/ticketScannerService.ts`
- `src/components/WalletPosterTicket.tsx`
- `src/screens/ExploreScreen.tsx`
- `src/features/tickets/service.ts`

## Dernière action

2026-11-12 — Déploiement universel du cœur Rust / WebAssembly sur le client et le backend Node.js, et branchement du quota `check_and_increment_ai_quota` dans `server.ts`.

## Vérifications

- `cargo test --manifest-path rust/gbaigbance-core/Cargo.toml` : 13 tests, 0 échec.
- `cargo build --target wasm32-unknown-unknown --release` : compilation Wasm réussie (381K).
- `node --experimental-strip-types --test src/server/aiCatalog.test.ts` : 8 tests, 0 échec.

## Backlog

1. P1 — Le repli GPS de l’edge function `get_nearby_events` renvoie encore les premiers événements publiés sans Haversine quand le RPC échoue. Le serveur Node.js utilise déjà le moteur Rust Wasm.
2. P2 — Le repli hors-ligne de `src/features/tickets/service.ts` génère désormais des billets signés par le moteur Rust.
3. P3 — Rappels 24 h / 2 h et alertes artistes suivis, si le service push n’est pas encore branché au démarrage de l’app.
