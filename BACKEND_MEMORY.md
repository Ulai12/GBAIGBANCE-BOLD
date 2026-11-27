# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Système likes / favoris / abonnements — alignement compteurs follows.

## Objectif
Faire en sorte que `toggle_artist_follow` et `toggle_organization_follow` mettent à jour `followers_count` comme `toggle_event_like` met à jour `likes_count` (COUNT source de vérité, protection is_demo).

## Progression
- Audit tables event_likes / artist_follows / organization_follows / user_follows + 4 RPCs toggle.
- Constat : artists.followers_count et organizations.followers_count existaient mais n'étaient **pas** mis à jour par les toggles.
- Migration 20261127160000 appliquée + versionnée (commit 1e2d548).
- EXECUTE : authenticated + service_role uniquement (anon révoqué).

## Fichiers concernés
- supabase/migrations/20261127160000_align_follow_toggles_followers_count.sql
- BACKEND_MEMORY.md

## Dernière action
2026-11-27 — Alignement toggle_artist_follow + toggle_organization_follow sur le pattern COUNT + is_demo.

## Prochaine étape
- Optionnel : resync one-shot des followers_count déjà désynchronisés (non-démo) si besoin.
- toggle_user_follow : pas de colonne followers_count sur profiles → rester table-only ou ajouter colonnes (À VALIDER).
- Tester un follow artiste/org non-démo côté app + like événement non-démo.
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.

## Vérifications
- Migration appliquée (success). OK.
- Fonctions en base : updates_count + protects_demo + uses_count = true. OK.
- Grants : authenticated + service_role + postgres ; pas d'anon. OK.
- Fichier migration distant 3375 o, SHA cd92971. OK.
- Aucune troncature cette session.

## Cartographie des données (domaine social)
- event_likes (PK event_id+user_id) → events.likes_count via toggle_event_like
- artist_follows (PK artist_id+user_id) → artists.followers_count via toggle_artist_follow
- organization_follows (unique org+user) → organizations.followers_count via toggle_organization_follow
- user_follows (unique follower+following, CHECK no self) → pas de compteur dénormalisé sur profiles
- RLS : SELECT public, INSERT/DELETE own (authenticated) sur les 4 tables

Conventions : montants entiers XOF, dates UTC, numéros +228/+229, RLS sur tables exposées.

## Liaisons front/back
- OK favoris événements : toggle_event_like (COUNT + is_demo)
- OK abonnements artistes/orgs : toggles alignés (following + followers_count + code FOLLOWED/UNFOLLOWED)
- OK user_follows : toggle_user_follow (following bool + code) — pas de compteur profil
- Client : FavoritesContext + interactions ; à confirmer que le front lit bien followers_count renvoyé
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET

## Migrations appliquées récentes
- 20261127160000_align_follow_toggles_followers_count (appliquée 2026-11-27)
- 20261127120000_add_tickets_checked_in_by_index (appliquée 2026-11-27)
- 20261126120000_fix_remaining_multiple_permissive_and_internal_tables_rls (appliquée 2026-11-26)
- 20261124130000_revoke_execute_internal_security_definer (appliquée 2026-11-24)
- 20261123130000_fix_toggle_event_like_and_likes_count (appliquée 2026-11-23)

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester un like événement non-démo + follow artiste/org non-démo (compteurs).

## Dette backend
- SECURITY DEFINER callable par authenticated (volontaire pour RPC front).
- Extension pg_net in public.
- Indexes unused (info, faible trafic).
- Compteurs is_demo (likes/followers) = seed marketing, non synchronisés (volontaire).
- profiles sans followers_count / following_count.

## Incidents
- Troncature BACKEND_MEMORY.md à PLACEHOLDER3 (détectée et restaurée session précédente).

## Backlog
- Resync optionnel followers_count non-démo si drift.
- Décider si profiles doit avoir des compteurs (À VALIDER).
- Audit notifications liées aux follows.
- Déplacer pg_net hors public.

## Historique
- 2026-11-27 (soir) : Alignement toggle_artist_follow / toggle_organization_follow (COUNT + is_demo + followers_count dans la réponse).
- 2026-11-27 (midi) : Index tickets.checked_in_by.
- 2026-11-26 : Consolidation policies permissives multiples + service_role tables internes.
- 2026-11-23 : Fix toggle_event_like (compteur fiable, protection is_demo).

## Pour les autres automatisations
- Branche unique FRONTEND-iA.
- Ne pas toucher aux fichiers visuels ni FRONTEND_MEMORY.md.
- Favoris événements : RPC toggle_event_like OK.
- Follows artistes/orgs : réponses JSON enrichies (`following`, `followers_count`, `code`). Rétrocompat si le front ne lisait que `following`.
- user_follows inchangé (pas de compteur profil).

## Taches À faire
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux paiements en staging.
- [Propriétaire] Tester like + follow non-démo (compteurs).
- [Backend] Optionnel resync followers_count drift.
- [Automatisation frontend] Utiliser `followers_count` renvoyé par les RPCs follow si l'UI affiche le nombre.

## 2026-11-27 — Note pour automatisations
- [Backend] Follows artistes/orgs : `followers_count` maintenant maintenu comme les likes. Aucun changement UI obligatoire.
- [Automatisation frontend] Localisation TicketScannerModal / OrganizerDashboard : voir notes précédentes. Ne pas toucher Explorer par catégories.
