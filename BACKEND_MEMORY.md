# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Drop table `example` (validé) + optimisation progressive des policies RLS auth initplan sur tables critiques.

## Objectif
Supprimer une table morte et réduire les warnings performance RLS en utilisant `(select auth.uid())` sur les tables les plus sollicitées (billets, paiements, profils, événements).

## Progression
- Table `public.example` droppée (0 lignes confirmées).
- Policies optimisées sur : profiles, tickets, payments, events, ticket_options.
- Warnings auth_rls_initplan : ~66 → 50.
- Migration appliquée et versionnée.

## Fichiers concernés
- supabase/migrations/20261118143000_drop_example_and_optimize_rls_critical.sql (nouveau)
- BACKEND_MEMORY.md

## Dernière action
2026-11-18 — Drop example + optimisation RLS tables critiques (commit 47198613).

## Prochaine étape
- Continuer l'optimisation RLS sur organizations, artists, follows, likes, comments, collaborators (lot suivant).
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.

## Vérifications
- `to_regclass('public.example')` = null → table absente. OK.
- Policies profiles/tickets/payments/events/ticket_options utilisent bien `( SELECT auth.uid() AS uid )`. OK.
- Advisors performance : auth_rls_initplan passé de ~66 à 50. OK.
- Relecture distante migration (taille ~4994 o). OK.

## Cartographie des données
Tables principales (public, RLS activée) :
- profiles, organizations, artists, events (access_type, external_ticket_url, whatsapp_*, cycle de vie)
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
- Client : payment.ts, tickets service branchés.
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET.

## Migrations appliquées récentes
- 20261118143000_drop_example_and_optimize_rls_critical (cette session)
- 20261118120000_add_remaining_fk_indexes
- Précédentes : payments, access_type, P2 features, FK indexes partiels, revoke EXECUTE anon.

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.

## Dette backend
- ~50 warnings auth RLS initplan restants (organizations, artists, follows, likes, comments, collaborators, schedule, questions…).
- Nombreux SECURITY DEFINER callable par anon/authenticated — revue progressive des grants.
- Extension pg_net in public.
- event_view_daily : RLS activée sans policy.

## Incidents
- Aucun cette session.

## Backlog
- Lot 2 optimisation RLS (organizations, artists, follows, likes, comments).
- Audit liaisons restantes (notifications, follows).
- Vérification compute_ticket_fees.

## Historique
- 2026-11-18 (après-midi) : Drop example + RLS critical tables optimisées.
- 2026-11-18 (matin) : Indexes FK restants.
- 2026-11-17 : Fondation paiements, P2 connecté, access_type, etc.

## Pour les autres automatisations
- Branche unique FRONTEND-iA.
- Ne pas toucher aux fichiers visuels ni FRONTEND_MEMORY.md.
- Paiements : secret webhook requis pour confirmer billets.
- Localisation TicketsScreen et ProfileScreen faites côté frontend, liaisons intactes.
- Localisation EventDetailScreen : clés `detail` ajoutées dans events.json (2026-11-20).

## Taches À faire
- [Automatisation frontend] Finaliser la localisation de EventDetailScreen.tsx (pousser les appels t()) puis continuer avec ExploreScreen / NotificationsScreen.
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
- [Backend] Lot 2 optimisation RLS (organizations, artists, follows, likes, comments, collaborators).
