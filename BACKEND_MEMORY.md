# BACKEND_MEMORY.md

Branche : FRONTEND-iA.
Projet Supabase : lwwiolbofrqakvrdvbbj (ACTIVE_HEALTHY)

## Tâche active
Maintenance compteurs sociaux — fonction de resynchronisation sécurisée.

## Objectif
Fournir un outil de resync one-shot (service_role uniquement) pour recalculer likes_count / followers_count des lignes non-démo depuis les tables de liaison, sans toucher aux seeds is_demo.

## Progression
- Vérification drift : 0 écart sur artists, organizations, events non-démo.
- Fonction resync_social_counters créée, appliquée et testée (retour 0 updates, grants OK).
- Migration versionnée (commit cab285a).

## Fichiers concernés
- supabase/migrations/20261128120000_add_resync_social_counters.sql
- BACKEND_MEMORY.md

## Dernière action
2026-11-28 — Ajout et application de resync_social_counters (non-démo only, service_role).

## Prochaine étape
- [Propriétaire] Tester un like / follow non-démo et observer le compteur.
- Confirmer proxy Vercel AI et secret PAYMENT_WEBHOOK_SECRET.
- Décider si profiles doit avoir des compteurs (A VALIDER).
- pg_net ne supporte pas SET SCHEMA (warning advisor restant).

## Vérifications
- Migration appliquée (success). OK.
- Fonction exécutée : success true, 0 rows updated (pas de drift). OK.
- Grants : uniquement postgres + service_role. OK.
- Fichier migration distant 1635 o, SHA 892de5c. OK.
- Aucune troncature cette session.

## Cartographie des données (domaine social)
- event_likes (PK event_id+user_id) → events.likes_count via toggle_event_like + resync
- artist_follows (PK artist_id+user_id) → artists.followers_count via toggle_artist_follow + resync
- organization_follows (unique org+user) → organizations.followers_count via toggle_organization_follow + resync
- user_follows (unique follower+following, CHECK no self) → pas de compteur dénormalisé sur profiles
- RLS : SELECT public, INSERT/DELETE own (authenticated) sur les 4 tables
- Realtime : publication supabase_realtime sur les 4 tables + notifications

Conventions : montants entiers XOF, dates UTC, numéros +228/+229, RLS sur tables exposées.

## Liaisons front/back
- OK favoris événements : toggle_event_like (COUNT + is_demo)
- OK abonnements artistes/orgs : toggles alignés (following + followers_count + code FOLLOWED/UNFOLLOWED)
- OK user_follows : toggle_user_follow (following bool + code) — pas de compteur profil
- Client : FavoritesContext + interactions ; à confirmer que le front lit bien followers_count renvoyé
- À confirmer : proxy Vercel /api/ai/assistant/stream, secret PAYMENT_WEBHOOK_SECRET

## Migrations appliquées récentes
- 20261128120000_add_resync_social_counters (appliquée 2026-11-28)
- 20261127160000_align_follow_toggles_followers_count (appliquée 2026-11-27)
- 20261127120000_add_tickets_checked_in_by_index (appliquée 2026-11-27)
- 20261126120000_fix_remaining_multiple_permissive_and_internal_tables_rls (appliquée 2026-11-26)
- 20261124130000_revoke_execute_internal_security_definer (appliquée 2026-11-24)

## ACTIONS REQUISES DU PROPRIÉTAIRE
- Configurer PAYMENT_WEBHOOK_SECRET dans le dashboard Supabase.
- Confirmer le proxy Vercel AI en production.
- Tester flux complet initiate/confirm/webhook en staging.
- Tester un like événement non-démo + follow artiste/org non-démo (compteurs).
- Appeler resync_social_counters si besoin de recalcul manuel (service_role).

## Dette backend
- SECURITY DEFINER callable par authenticated (volontaire pour RPC front).
- Extension pg_net in public (ne supporte pas SET SCHEMA).
- Indexes unused (info, faible trafic).
- Compteurs is_demo (likes/followers) = seed marketing, non synchronisés (volontaire).
- profiles sans followers_count / following_count.

## Incidents
- Troncature BACKEND_MEMORY.md à PLACEHOLDER3 (détectée et restaurée session précédente).

## Backlog
- Décider si profiles doit avoir des compteurs (A VALIDER).
- Audit notifications liées aux follows (déjà partiellement fait via create_notification).
- Déplacer pg_net hors public (non supporté nativement).

## Historique
- 2026-11-28 : Ajout resync_social_counters (service_role, non-démo only).
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
- Nouvelle RPC interne : resync_social_counters (service_role only).

## Taches À faire
- [Propriétaire] Configurer PAYMENT_WEBHOOK_SECRET et tester le flux paiements en staging.
- [Propriétaire] Tester like + follow non-démo (compteurs).
- [Backend] Aucune action immédiate requise sur les compteurs.
- [Automatisation frontend] Utiliser `followers_count` renvoyé par les RPCs follow si l'UI affiche le nombre.

## 2026-11-28 — Note pour automatisations
- [Backend] resync_social_counters disponible pour maintenance. Aucun changement UI.
- [Automatisation frontend] Ne pas réécrire les gros fichiers TSX en entier via connecteur (risque troncature >25ko). Petites modifs ciblées uniquement.
