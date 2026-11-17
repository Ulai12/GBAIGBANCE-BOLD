# BACKEND_MEMORY.md

Branche : FRONTEND-iA.

## Session 2026-11-17 — Audit liaisons fantomes

### Corrige immediatement
- events.main_category / subcategory (colonnes + backfill meta + mutations)
- user_follows (table + RLS)
- notification_preferences (table + RLS)
- RPC increment_likes_count / decrement_likes_count
- RPC increment_event_views (alias analytics)
- tickets: recipient_*, buyer_*, claim_*, is_for_me
- profiles: cover_url, preferred_genres
- tickets.status: valid/pending/active/... + migration active→valid
- book_ticket / confirm_ticket_payment: status valid + garde external/whatsapp

### Encore NON branches (P2/P3 — pas bloquant vente de base)
- RPC claim_ticket_by_token, regenerate_claim_link (cadeaux)
- RPC request_ticket_refund, review_refund + table ticket_refunds
- RPC complete_presence_challenge + table presence badges
- RPC get_event_attendees
- comment_reactions table
- events.cancellation_reason / postponed_to / suspension_reason
- purchase_tickets_multi (multi-beneficiaires serveur)

### Deja OK
- access_type external/whatsapp/tickets
- payments + fees + webhook
- event_likes, artist_follows, organization_follows
- record_event_view (dedupe)

Projet: lwwiolbofrqakvrdvbbj
