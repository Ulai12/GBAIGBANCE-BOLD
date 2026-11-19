# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Restauration des RPCs critiques manquantes set_event_status et validate_ticket_qr (liaisons front/back cassées) + alignement contrainte statut events.

## Objectif
Rétablir les fonctions serveur appelées par le frontend pour la gestion du cycle de vie des événements et la validation QR à l'entrée, absentes de la base malgré les migrations historiques.

## Progression
- Contrainte events_status_check élargie (draft/pending/published/paused/suspended/cancelled/completed/postponed). 0 violation.
- Fonctions set_event_status et validate_ticket_qr recréées (SECURITY DEFINER, search_path=public, grants authenticated uniquement).
- Migration appliquée et versionnée.

## Fichiers concernés
- supabase/migrations/20261119100000_restore_event_status_and_qr_validation_rpcs.sql (nouveau)
- BACKEND_MEMORY.md

## Dernière action
2026-11-19 — Restauration RPCs set_event_status + validate_ticket_qr + contrainte statut (commit 4f80c2a8).

## Prochaine étape
- Vérifier liaisons end-to-end (setEventStatus depuis EventManagementModal, validateTicketQr depuis scanner).
- Continuer lot 2 optimisation RLS si besoin.
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.

## Vérifications
- pg_proc contient set_event_status et validate_ticket_qr. OK.
- Contrainte events_status_check mise à jour. OK.
- Relecture distante migration (taille ~4915 o, contenu intact). OK.
- Aucune troncature.

## Cartographie des données
Tables principales (public, RLS activée) :
- profiles, organizations, artists, events (access_type, external_ticket_url, whatsapp_*, cycle de vie complet)
- tickets (status, recipient_*, claim_token, payment_id, ticket_option_id)
- payments (ledger MM, idempotency_key)
- ticket_refunds, event_presence_badges, comment_reactions
- event_likes, artist_follows, user_follows, organization_follows
- notifications, notification_preferences
- ticket_options, event_collaborators, event_comments, etc.
- platform_settings (1 ligne)
- event_view_daily (RLS no policy — à traiter plus tard)
- ~~example~~ (supprimée 2026-11-18)

Conventions : montants entiers XOF, dates UTC, numéros +228/+229, RLS sur tables exposées.

## Liaisons front/back
- OK : initiate_ticket_payment / confirm_ticket_payment / webhook, purchase_tickets_multi, claim_ticket_by_token, refunds, presence badges, get_event_attendees, comment_reactions, event lifecycle columns.
- Restaurées : set_event_status (setEventStatus), validate_ticket_qr (validateTicketQr).
- Client : payment.ts, tickets service branchés.
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET.

## Migrations appliquées récentes
- 20261119100000_restore_event_status_and_qr_validation_rpcs (cette session)
- 20261119010000_optimize_rls_remaining_tables
- 20261118143000_drop_example_and_optimize_rls_critical
- 20261118120000_add_remaining_fk_indexes
- Précédentes : payments, access_type, P2 features, FK indexes partiels, revoke EXECUTE anon.

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester validation QR et changement de statut événement en staging.

## Dette backend
- ~50 warnings auth RLS initplan restants (lot 2 déjà partiellement traité dans 20261119010000).
- Nombreux SECURITY DEFINER callable par anon/authenticated — revue progressive des grants.
- Extension pg_net in public.
- event_view_daily : RLS activée sans policy.

## Incidents
- Aucun cette session. RPCs absentes malgré migrations historiques — restaurées.

## Backlog
- Vérification end-to-end des nouvelles RPCs.
- Audit liaisons restantes (notifications, follows).
- Vérification compute_ticket_fees.

## Historique
- 2026-11-19 : Restauration set_event_status + validate_ticket_qr.
- 2026-11-18 (après-midi) : Drop example + RLS critical tables optimisées.
- 2026-11-18 (matin) : Indexes FK restants.
- 2026-11-17 : Fondation paiements, P2 connecté, access_type, etc.

## Pour les autres automatisations
- Branche unique FRONTEND-iA.
- Ne pas toucher aux fichiers visuels ni FRONTEND_MEMORY.md.
- Paiements : secret webhook requis pour confirmer billets.
- Localisation TicketsScreen et ProfileScreen faites côté frontend, liaisons intactes.
- RPCs set_event_status et validate_ticket_qr maintenant présentes.

## Taches À faire
- [Automatisation frontend] Continuer la localisation des écrans restants (EventDetailScreen prioritaire).
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
- [Backend] Tester les RPCs restaurées en conditions réelles.
