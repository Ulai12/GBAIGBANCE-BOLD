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


## Taches À faire (pour l'automatisation backend / autres)
- [ ] Confirmer le proxy Vercel AI (edge ai-assistant) en production si pas déjà fait.
- [ ] Configurer le secret PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase (action propriétaire).
- [ ] Vérifier que les migrations payments / platform_settings sont bien appliquées et que compute_ticket_fees fonctionne.
- [ ] Tester le flux complet initiate/confirm/webhook en staging avant production.
- Source : session frontend 2026-11-18 (localisation TicketsScreen), pas de nouveau problème backend détecté, mais rappels des actions précédentes.

