# BACKEND_MEMORY.md

Branche d'ecriture unique : `FRONTEND-iA`.

## Tache active

Session 2026-11-17 PM — Flux paiement billets (initiate / confirm / webhook / liaison frais).

## Objectif

Backend coherent, sur, sans casser le front existant.

## Progression

- Termine :
  - Migration fees v1 (platform_settings, payments, compute_ticket_fees).
  - RPC `initiate_ticket_payment` (authenticated) → payment pending, detail frais, stock verifie, **aucun billet**.
  - RPC `confirm_ticket_payment` (service_role) → emission billets + stock + attendees ; idempotente.
  - Edge `payment-webhook` v1 deployee (verify_jwt false, HMAC optionnel via PAYMENT_WEBHOOK_SECRET).
  - Client `src/features/tickets/payment.ts` : fetchTicketFeeQuote, initiateTicketPayment, updateTicketOptionForOrganizer.
- Gratuits : toujours `book_ticket` (inchange).

## Fichiers

- supabase/migrations/20261117143000_payments_and_platform_fees_v1.sql
- supabase/migrations/20261117144500_ticket_payment_initiate_confirm_v1.sql
- supabase/functions/payment-webhook/index.ts
- src/features/tickets/payment.ts
- BACKEND_MEMORY.md

## Verifications

- RPC presentes en base.
- Edge payment-webhook ACTIVE v1.
- compute_ticket_fees(5000,2,mobile_money,buyer) → charged 10300 (verifie session precedente).

## Prochaine etape

1. Configurer secret `PAYMENT_WEBHOOK_SECRET` dans le projet Supabase (dashboard).
2. Brancher un PSP reel (TMoney/Flooz/Wave) : apres collect, POST webhook avec payment_id + provider_ref.
3. Frontend : checkout appelle fetchTicketFeeQuote + initiateTicketPayment (liaison deja dispo).
4. Orga UI : updateTicketOptionForOrganizer (fee_payer, prix, stock).

## ACTIONS REQUISES DU PROPRIETAIRE

1. Definir PAYMENT_WEBHOOK_SECRET et le noter hors depot.
2. Choisir PSP + cles marchand.
3. Valider taux 2,5%+50 XOF MM.

## Pour les autres automatisations

- Checkout : `fetchTicketFeeQuote` puis `initiateTicketPayment` — ne pas appeler book_ticket pour les payants.
- Billet payant uniquement apres webhook succeeded.
- Edge URL : `/functions/v1/payment-webhook`

Projet Supabase : lwwiolbofrqakvrdvbbj.
