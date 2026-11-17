# BACKEND_MEMORY.md

Branche : FRONTEND-iA.

## Session 2026-11-17 — Connexion complete P2

### Connecte
- claim_ticket_by_token / regenerate_claim_link
- request_ticket_refund / review_refund + table ticket_refunds
- complete_presence_challenge + event_presence_badges
- get_event_attendees
- comment_reactions
- events.cancellation_reason, suspension_reason, postponed_to, postponement_deadline
- purchase_tickets_multi (gratuits multi + cadeaux)
- Client purchaseTicketsMulti → initiate (payant) / purchase_tickets_multi (gratuit)

### Paiement payant
- initiate → payment pending
- webhook payment-webhook → confirm → billets valid
- Secret PAYMENT_WEBHOOK_SECRET encore ACTIONS REQUISES

Projet: lwwiolbofrqakvrdvbbj
