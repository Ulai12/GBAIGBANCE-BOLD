# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Ajout d'index sur les clés étrangères restantes non couvertes (advisors performance) pour tables critiques paiements, remboursements, présence, commentaires.

## Objectif
Améliorer les performances des jointures futures sans impact sur le fonctionnement existant (base vide pour l'instant).

## Progression
- Migration appliquée sur Supabase : 20261118120000_add_remaining_fk_indexes
- Fichier versionné sur FRONTEND-iA
- Index vérifiés par requête pg_indexes

## Fichiers concernés
- supabase/migrations/20261118120000_add_remaining_fk_indexes.sql (nouveau)
- BACKEND_MEMORY.md

## Dernière action
2026-11-18 — Application migration indexes FK restants + commit bd6aa246.

## Prochaine étape
- Auditer et éventuellement corriger les policies RLS auth initplan (66 warnings) de façon progressive et sécurisée.
- Vérifier liaisons front/back pour le nouveau flux tickets localisé.
- Confirmer proxy Vercel AI et secret webhook.

## Vérifications
- Indexes créés : idx_payments_ticket_option_id, idx_ticket_refunds_*, idx_event_presence_badges_*, idx_comment_reactions_user_id, idx_event_comments_user_id, idx_notifications_actor_id, idx_artists_user_id, idx_event_artists_artist_id. OK.
- Aucune troncature (taille fichier ~1706 o, contenu intact).
- Advisors performance : unindexed FK réduits.

## Cartographie des données
Tables principales (public, RLS activée) :
- profiles, organizations, artists, events (avec access_type, external_ticket_url, whatsapp_*, cycle de vie)
- tickets (status, recipient_*, claim_token, payment_id, ticket_option_id)
- payments (ledger MM, idempotency_key)
- ticket_refunds, event_presence_badges, comment_reactions
- event_likes, artist_follows, user_follows, organization_follows
- notifications, notification_preferences
- ticket_options, event_collaborators, event_comments, etc.
- platform_settings (1 ligne)
- example (vide, RLS no policy — À VALIDER drop)
- event_view_daily (RLS no policy)

Conventions : montants entiers XOF, dates UTC, numéros +228/+229, RLS sur tables exposées.

## Liaisons front/back
- OK : initiate_ticket_payment / confirm_ticket_payment / webhook, purchase_tickets_multi, claim_ticket_by_token, refunds, presence badges, get_event_attendees, comment_reactions, event lifecycle columns.
- Client : payment.ts, tickets service branchés.
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET.

## Migrations appliquées récentes
- 20261118120000_add_remaining_fk_indexes (cette session) — rollback : DROP INDEX des 10 indexes.
- Précédentes : payments, access_type, P2 features, FK indexes partiels, revoke EXECUTE anon sur certaines fonctions.

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- À VALIDER : drop table public.example (vide, no policy).

## Dette backend
- Nombreux SECURITY DEFINER callable par anon/authenticated (advisors) — revue progressive des grants.
- 66 auth RLS initplan warnings — optimisation progressive.
- Extension pg_net in public.

## Incidents
- Aucun cette session. Historique troncatures résolues précédemment.

## Backlog
- Optimisation RLS policies (select auth.uid()).
- Audit liaisons restantes (notifications, follows, likes).
- Vérification compute_ticket_fees.

## Historique
- 2026-11-18 : Indexes FK restants (paiements, remboursements, présence).
- 2026-11-17 : Fondation paiements, P2 connecté, access_type, etc.

## Pour les autres automatisations
- Branche unique FRONTEND-iA.
- Ne pas toucher aux fichiers visuels ni FRONTEND_MEMORY.md.
- Paiements : secret webhook requis pour confirmer billets.
- Localisation TicketsScreen et ProfileScreen faites côté frontend, liaisons intactes.

## Taches À faire
- [Automatisation frontend - session 2026-11-18] Continuer la localisation des écrans restants (EventDetailScreen prioritaire). Problème détecté : textes hardcodés en français dans plusieurs screens. Origine : développement continu intelligent.
- [Automatisation backend / propriétaire] Configurer le secret PAYMENT_WEBHOOK_SECRET et tester le flux complet initiate/confirm/webhook en staging. Problème : secret non configuré, confirmation des billets bloquée sans lui.
- [Automatisation Vercel] Vérifier et confirmer le fonctionnement du proxy /api/ai/assistant/stream en production après déploiement. Problème : statut non confirmé.
- [Automatisation backend] Revue progressive des 66 warnings RLS auth initplan et des SECURITY DEFINER grants. Problème détecté par advisors Supabase.
- [Automatisation backend] À VALIDER : drop de la table public.example (vide, no RLS policy).
