# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Revue progressive des grants SECURITY DEFINER : révocation EXECUTE de anon sur les fonctions qui exigent une authentification ou sont internes.

## Objectif
Réduire la surface d'exposition RPC pour les fonctions SECURITY DEFINER non destinées aux utilisateurs anonymes. Les fonctions vérifient déjà auth.uid(), mais l'appel anonyme est inutile et génère des warnings advisors.

## Progression
- Migration 20261123120000 appliquée en base (apply_migration success) et versionnée sur FRONTEND-iA.
- REVOKE EXECUTE FROM anon sur ~22 fonctions (book_ticket, initiate_ticket_payment, toggles, refunds, create_notification, rls_auto_enable, etc.).
- Conservées pour anon : get_platform_stats, increment_event_views, record_event_view (usage public légitime).
- Advisors security : le nombre de anon_security_definer_function_executable a baissé.

## Fichiers concernés
- supabase/migrations/20261123120000_revoke_anon_execute_on_auth_required_functions.sql
- BACKEND_MEMORY.md

## Dernière action
2026-11-23 — Application migration revoke anon EXECUTE + versionnement. Mémoire mise à jour.

## Prochaine étape
- Vérifier liaisons end-to-end (setEventStatus, validateTicketQr, initiate/confirm).
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.
- Continuer revue authenticated grants si nécessaire (beaucoup sont intentionnels).

## Vérifications
- Migration enregistrée et fichier distant présent (taille ~2.2ko). OK.
- Aucune troncature cette session.
- Les fonctions conservent leurs checks auth.uid() internes.

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
- event_view_daily (table interne, policy service_role ajoutée 2026-11-23)
- ~~example~~ (supprimée 2026-11-18)

Conventions : montants entiers XOF, dates UTC, numéros +228/+229, RLS sur tables exposées.

## Liaisons front/back
- OK : initiate_ticket_payment / confirm_ticket_payment / webhook, purchase_tickets_multi, claim_ticket_by_token, refunds, presence badges, get_event_attendees, comment_reactions, event lifecycle columns.
- Restaurées : set_event_status (setEventStatus), validate_ticket_qr (validateTicketQr).
- Client : payment.ts, tickets service branchés.
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET.

## Migrations appliquées récentes
- 20261123120000_revoke_anon_execute_on_auth_required_functions (appliquée 2026-11-23)
- 20261123010000_fix_event_view_daily_rls_and_duplicate_index (appliquée 2026-11-23)
- 20261119010000_optimize_rls_remaining_tables (appliquée 2026-11-21)
- 20261120100000_add_remaining_fk_indexes
- 20261119100000_restore_event_status_and_qr_validation_rpcs
- 20261118143000_drop_example_and_optimize_rls_critical
- 20261118120000_add_remaining_fk_indexes
- Précédentes : payments, access_type, P2 features, FK indexes partiels, revoke EXECUTE anon partiel.

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester validation QR et changement de statut événement en staging.

## Dette backend
- Nombreux SECURITY DEFINER callable par authenticated — revue progressive des grants (beaucoup sont nécessaires).
- Extension pg_net in public.
- Quelques multiple permissive policies (event_comments, event_questions, etc.).
- Indexes unused (info, normal en faible trafic).

## Incidents
- Troncature BACKEND_MEMORY.md à PLACEHOLDER3 (détectée et restaurée session précédente).

## Backlog
- Vérification end-to-end des nouvelles RPCs.
- Audit liaisons restantes (notifications, follows).
- Vérification compute_ticket_fees.
- Revue grants SECURITY DEFINER authenticated.

## Historique
- 2026-11-23 : Revoke EXECUTE anon sur fonctions auth-required (batch ~22).
- 2026-11-23 : Policy RLS event_view_daily + drop index dupliqué tickets.
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
- event_view_daily : policy service_role en place (table interne).
- EXECUTE anon révoqué sur les RPCs qui exigent auth.uid().

## Taches À faire
- [Automatisation frontend / main] EventDetailScreen.tsx avait été tronqué en placeholder sur main ; restauré depuis FRONTEND-iA. Continuer localisation ExploreScreen (partiellement faite). Merger main dans FRONTEND-iA si besoin pour synchroniser les clés i18n.

- [Automatisation frontend] Continuer la localisation des écrans restants.
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
- [Backend] Tester les RPCs restaurées en conditions réelles.
- [Backend] Revue progressive des grants SECURITY DEFINER (authenticated).
- [Automatisation frontend / Propriétaire] Merger main dans FRONTEND-iA pour intégrer les localisations récentes si divergences.

## Taches À faire (mise à jour 2026-11-23 — automatisation frontend/main)
- [Automatisation frontend / main] NotificationsScreen localisé (domaine notifications FR/EN). Continuer revue mobile 320px.
- [Automatisation frontend / FRONTEND-iA] events.json FR/EN restaurés (tailles 42191 / 37953). Prochaine : localisation progressive OrganizerDashboardScreen par petits commits.
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
