# BACKEND_MEMORY.md

Memoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'ecriture unique : `FRONTEND-iA`.

## Tache active

Session 2026-11-17 (apres-midi) — Fondation paiements billets + commission plateforme.

## Objectif

Rendre le backend coherent, sur et bien range sans rien casser.

## Progression

- Termine :
  - Migration `payments_and_platform_fees_v1` appliquee sur lwwiolbofrqakvrdvbbj.
  - Tables `platform_settings`, `payments` ; colonnes frais sur `tickets` / `ticket_options`.
  - RPC `compute_ticket_fees` (XOF entiers) verifiee.
  - Taux par defaut : Mobile Money 2,5 % + 50 XOF ; carte 3,5 % + 100 XOF ; fee_payer buyer|organizer.
  - Alignement credentials server.ts (session matin).
- Non fait (ACTIONS REQUISES) :
  - Integration reelle TMoney / Flooz / Wave (cles marchand, webhooks).
  - RPC purchase confirmee apres paiement + emission billet seulement si succeeded.
  - Dashboard organisateur payout (UI = frontend).

## Fichiers concernes

- `supabase/migrations/20261117143000_payments_and_platform_fees_v1.sql`
- `BACKEND_MEMORY.md`

## Derniere action

2026-11-17 — Migration fees + ledger payments + compute_ticket_fees.

## Prochaine etape

1. Edge function `payment-webhook` (signature, idempotence, passage status succeeded, creation tickets).
2. Etendre `book_ticket` ou creer `initiate_ticket_payment` (cree payments initiated, ne livre pas de billet payant avant webhook).
3. Brancher front sur `compute_ticket_fees` + affichage frais au checkout (liaison uniquement).

## Verifications

- compute_ticket_fees(5000, 2, mobile_money, buyer) => face 10000, platform 300, charged 10300, payout 10000. Verifie.
- Tables payments / platform_settings presentes.
- Billets gratuits inchanges (book_ticket existant).

## Modele metier (recherche + choix)

- Eventbrite-like : frais service % + fixe, passables a l'acheteur (defaut) ou absorbables par l'organisateur.
- Afrique Ouest : Mobile Money ~1–2 % operateur ; commission plateforme cible 2,5 % + 50 XOF (alignee coreFinancialFees client).
- Montants en entiers XOF. Pas de double debit : payments.idempotency_key + provider_ref uniques.

## ACTIONS REQUISES DU PROPRIETAIRE

1. Choisir / ouvrir compte marchand (TMoney, Flooz, Wave ou agregateur type Flutterwave) et fournir secrets hors code.
2. Valider le taux de commission (actuellement 2,5 % + 50 XOF MM) et si defaut = acheteur paie les frais.
3. Decision conflit server.ts main vs FRONTEND-iA.

## Historique

- 2026-11-17 — Fondation payments + fees.
- 2026-11-17 — Alignement credentials server.ts.
- 2026-11-16 — Job cron rappels.

## Pour les autres automatisations

- Lire `platform_settings` key `ticket_fees` ou RPC `compute_ticket_fees` pour afficher le total checkout.
- Ne pas marquer un billet payant `active` sans `payments.status = succeeded`.
- Organisateur : `ticket_options.fee_payer`, `price`, `quantity_*`, `is_active`, fenetres de vente.

## Cartographie des donnees

Tables : ... + **payments**, **platform_settings**.
Tickets : + payment_id, ticket_option_id, platform_fee_xof, organizer_net_xof, fee_payer.
Ticket_options : + fee_payer, is_active, sales_start_at, sales_end_at.

Projet Supabase actif : lwwiolbofrqakvrdvbbj.
