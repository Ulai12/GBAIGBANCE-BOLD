# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Optimisation RLS auth initplan (remplacement auth.uid() par (select auth.uid())) sur les policies restantes pour éliminer les warnings performance.

## Objectif
Réduire à zéro les 50 warnings auth_rls_initplan des advisors Supabase en appliquant la migration existante non déployée 20261119010000.

## Progression
- Migration 20261119010000 appliquée en base (en parties sécurisées via execute_sql).
- Toutes les policies concernées recréées avec (select auth.uid()).
- Compteur remaining_bad_policies passé de 50 à 0.
- Advisors performance : plus de auth_rls_initplan.
- Nettoyage de policies dupliquées sur user_follows.

## Fichiers concernés
- supabase/migrations/20261119010000_optimize_rls_remaining_tables.sql (déjà versionné, appliqué)
- BACKEND_MEMORY.md

## Dernière action
2026-11-21 — Application de l'optimisation RLS auth initplan (remaining = 0). Mémoire mise à jour.

## Prochaine étape
- Vérifier liaisons end-to-end (setEventStatus, validateTicketQr).
- Traiter event_view_daily RLS (no policy).
- Revue progressive des SECURITY DEFINER grants.
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.

## Vérifications
- remaining_bad_policies = 0. OK.
- Advisors performance : auth_rls_initplan disparu. OK.
- Aucune troncature cette session.
- Migration enregistrée dans schema_migrations.

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
- 20261119010000_optimize_rls_remaining_tables (appliquée 2026-11-21)
- 20261120100000_add_remaining_fk_indexes
- 20261119100000_restore_event_status_and_qr_validation_rpcs
- 20261118143000_drop_example_and_optimize_rls_critical
- 20261118120000_add_remaining_fk_indexes
- Précédentes : payments, access_type, P2 features, FK indexes partiels, revoke EXECUTE anon.

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester validation QR et changement de statut événement en staging.

## Dette backend
- Nombreux SECURITY DEFINER callable par anon/authenticated — revue progressive des grants.
- Extension pg_net in public.
- event_view_daily : RLS activée sans policy.
- Quelques multiple permissive policies (event_comments, event_questions, etc.).
- Indexes unused (info, normal en faible trafic).

## Incidents
- Troncature BACKEND_MEMORY.md à PLACEHOLDER3 (détectée et restaurée session précédente).

## Backlog
- Vérification end-to-end des nouvelles RPCs.
- Audit liaisons restantes (notifications, follows).
- Vérification compute_ticket_fees.
- Traitement event_view_daily RLS.
- Revue grants SECURITY DEFINER.

## Historique
- 2026-11-21 : Optimisation RLS auth initplan complétée (50 → 0).
- 2026-11-20 : Indexes FK restants + restauration mémoire.
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
- Indexes FK complétés.
- RLS auth initplan optimisée sur toutes les tables exposées.

## Taches À faire
- [Automatisation frontend] Continuer la localisation des écrans restants (EventDetailScreen prioritaire).
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
- [Backend] Tester les RPCs restaurées en conditions réelles.
- [Backend] Ajouter policy sur event_view_daily ou désactiver RLS si table interne.
- [Automatisation frontend / Propriétaire] Merger main dans FRONTEND-iA pour intégrer la localisation EventDetailScreen (commits récents sur main). Éviter divergences.
