# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Durcissement sécurité : REVOKE EXECUTE sur les fonctions internes / trigger SECURITY DEFINER qui ne doivent pas être appelables via RPC.

## Objectif
Empêcher les utilisateurs authentifiés (et anon/public) d'appeler directement des helpers internes et des fonctions de trigger via PostgREST.

## Progression
- Revue progressive des grants authenticated sur SECURITY DEFINER commencée.
- Fonctions internes identifiées : increment/decrement_likes_count, update_event_price_range (trigger), rls_auto_enable (event trigger), create_notification.
- Migration 20261124130000 appliquée sur Supabase + versionnée.
- ACL confirmée : plus de grant PUBLIC/anon/authenticated, seulement postgres + service_role.

## Fichiers concernés
- supabase/migrations/20261124130000_revoke_execute_internal_security_definer.sql
- BACKEND_MEMORY.md

## Dernière action
2026-11-24 — Migration revoke EXECUTE sur fonctions internes SECURITY DEFINER appliquée et versionnée (commit e23fdb1d). Mémoire mise à jour.

## Prochaine étape
- Vérifier liaisons end-to-end (setEventStatus, validateTicketQr, initiate/confirm).
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.
- Tester un like réel sur un événement non-démo (likes_count doit suivre).
- Continuer la revue des grants authenticated sur les autres SECURITY DEFINER (ceux qui sont légitimes pour le front restent).

## Vérifications
- Migration appliquée (success). OK.
- ACL post-migration : pas de PUBLIC/anon/authenticated. OK.
- Fichier migration distant présent (2186 o, SHA 45f30597). OK.
- Aucune troncature cette session.

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
- OK favoris : toggle_event_like (RPC corrigée), FavoritesContext + realtime event_likes.
- Restaurées : set_event_status (setEventStatus), validate_ticket_qr (validateTicketQr).
- Client : payment.ts, tickets service branchés.
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET.

## Migrations appliquées récentes
- 20261124130000_revoke_execute_internal_security_definer (appliquée 2026-11-24)
- 20261124120000_revoke_anon_execute_remaining_auth_functions (appliquée 2026-11-24)
- 20261123130000_fix_toggle_event_like_and_likes_count (appliquée 2026-11-23)
- 20261123120000_revoke_anon_execute_on_auth_required_functions (appliquée 2026-11-23)
- 20261123010000_fix_event_view_daily_rls_and_duplicate_index (appliquée 2026-11-23)
- 20261119010000_optimize_rls_remaining_tables (appliquée 2026-11-21)
- 20261120100000_add_remaining_fk_indexes
- 20261119100000_restore_event_status_and_qr_validation_rpcs
- 20261118143000_drop_example_and_optimize_rls_critical
- 20261118120000_add_remaining_fk_indexes

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester validation QR et changement de statut événement en staging.
- Tester un like sur un événement réel (non démo) et vérifier likes_count.

## Dette backend
- Nombreux SECURITY DEFINER callable par authenticated — revue progressive des grants (beaucoup sont nécessaires pour le front).
- Extension pg_net in public.
- Quelques multiple permissive policies (event_comments, event_questions, etc.).
- Indexes unused (info, normal en faible trafic).
- likes_count des événements is_demo = valeurs seed (volontaire, non synchronisées avec event_likes).

## Incidents
- Troncature BACKEND_MEMORY.md à PLACEHOLDER3 (détectée et restaurée session précédente).

## Backlog
- Vérification end-to-end des nouvelles RPCs.
- Audit liaisons restantes (notifications, follows).
- Vérification compute_ticket_fees.
- Continuer la revue grants SECURITY DEFINER authenticated.

## Historique
- 2026-11-24 : Revoke EXECUTE (PUBLIC/anon/authenticated) sur fonctions internes SECURITY DEFINER (increment/decrement_likes_count, update_event_price_range, rls_auto_enable, create_notification).
- 2026-11-24 : Revoke EXECUTE anon sur RPCs restantes (book_ticket, cancel_ticket, accept_collaboration, submit_event_report, create_notification + internes).
- 2026-11-23 : Fix toggle_event_like (compteur fiable, protection is_demo).
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
- Favoris : RPC toggle_event_like corrigée ; le front (FavoritesContext) reste inchangé.
- RPCs set_event_status et validate_ticket_qr présentes.
- Indexes FK complétés.
- RLS auth initplan optimisée.
- event_view_daily : policy service_role en place.
- EXECUTE anon révoqué sur les RPCs qui exigent auth.uid() (batch complété).
- EXECUTE révoqué sur les helpers internes et fonctions trigger (increment/decrement_likes_count, update_event_price_range, rls_auto_enable, create_notification).

## Taches À faire
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux initiate/confirm/webhook en staging.
- [Vercel] Confirmer le proxy /api/ai/assistant/stream en production.
- [Backend] Tester les RPCs restaurées + un like réel non-démo.
- [Backend] Continuer la revue progressive des grants SECURITY DEFINER (authenticated).
- [Automatisation frontend] Continuer la localisation des écrans restants (OrganizerDashboard, etc.).

## 2026-11-24 — Note pour automatisations
- [Automatisation frontend] Localisation EventManagementModal terminée (clés manage.*). Prochaine : TicketScannerModal. Ne pas toucher Explorer par catégories.

## 2026-11-25 — Note pour automatisations
- [Automatisation frontend] TicketScannerModal : dernier libellé hardcodé "Fermer" du drawer historique remplacé par t() (commit 40066d53). Clés scannerModal.* déjà branchées. Prochaine étape suggérée : vérifier exhaustivement les autres composants organizer pour d'éventuels hardcodes restants, puis états loading/empty. Ne pas toucher Explorer par catégories.
