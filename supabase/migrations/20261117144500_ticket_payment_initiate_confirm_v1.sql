-- initiate_ticket_payment + confirm_ticket_payment
-- Applique sur lwwiolbofrqakvrdvbbj (2026-11-17)
-- Voir definitions live dans la base ; ce fichier documente le contrat.

-- initiate_ticket_payment(...): cree payments pending, aucun billet
-- confirm_ticket_payment(...): service_role only, emet tickets active
-- Edge: payment-webhook (HMAC x-gba-signature, PAYMENT_WEBHOOK_SECRET)
