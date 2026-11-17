# BACKEND_MEMORY.md

Mémoire de travail backend / base / liaisons de GBAIGBANCE-BOLD.  
Branche d'écriture unique : `FRONTEND-iA`.

## Tâche active

Session 2026-11-17 — Alignement des credentials Supabase dans server.ts.

## Objectif

Rendre le backend cohérent, sûr et bien rangé sans rien casser.

## Progression

- Terminé :
  - Correction de DEFAULT_SUPABASE_URL et DEFAULT_SUPABASE_ANON_KEY dans server.ts vers le projet actif lwwiolbofrqakvrdvbbj (GBAIGBANCE EVENTS).
  - Incident de troncature temporaire via connecteur résolu (commits intermédiaires, restauration via API directe).
  - Taille fichier préservée (30763 octets).
- En cours :
  - Advisors sécurité : RLS sans policy sur event_view_daily et example ; SECURITY DEFINER functions encore exécutables par anon/authenticated (book_ticket, etc.).
  - DEFAULT_SUPABASE_URL corrigé côté serveur.

## Fichiers concernés

- `server.ts` (commit c7db68ed...)
- `BACKEND_MEMORY.md`

## Dernière action

2026-11-17 — Alignement URL/key Supabase dans server.ts + restauration post-troncature.

## Prochaine étape

1. Vérifier les revokes EXECUTE sur les fonctions SECURITY DEFINER (advisors).
2. Considérer le déplacement de pg_net hors du schéma public.
3. Tester une liaison front → server.ts → base pour les outils AI.

## Vérifications

- Fichier server.ts relu distant : SHA 1240d3b3..., taille 30763, contient lwwiolbofrqakvrdvbbj.
- Commit c7db68edf944124e65f28b8e8fdd8200fe971ae8 dans l'historique de la branche.
- Pas de rétrécissement >20%.

## Points d'attention

- Incident de troncature récurrent avec le connecteur GitHub (placeholders). Utiliser gh API ou push_files avec contenu complet vérifié.
- server.ts local (FRONTEND-iA) était désynchronisé avec client.ts et le projet actif.
- Conflit historique avec server.ts sur main (encore qbngq dans certains commits).

## ACTIONS REQUISES DU PROPRIÉTAIRE

1. Décision sur le conflit `server.ts` (main vs FRONTEND-iA).
2. Confirmation des variables d'environnement (service role pour les fonctions).
3. Validation pour durcir davantage les SECURITY DEFINER (revoke EXECUTE anon).

## Historique

- 2026-11-17 — Alignement credentials Supabase dans server.ts.
- 2026-11-16 — Job cron rappels configuré.

## Pour les autres automatisations

- server.ts sur FRONTEND-iA pointe désormais sur https://lwwiolbofrqakvrdvbbj.supabase.co.
- Edge Functions et client.ts déjà alignés.
- Assistant IA edge v7 opérationnel ; proxy Vercel `api/ai/assistant/stream.ts` présent sur main, en attente de déploiement pour éviter les 502.

## Tâches À faire

- [Automatisation frontend] 2026-11-17 : Incident d'écriture sur FRONTEND_MEMORY.md (placeholders). Restauration à faire (ne pas toucher depuis backend).
- Vérifier cohérence des appels AI depuis le frontend vers le serveur local/Vercel.
- [Automatisation développement continu] 2026-11-17 : Confirmer le déploiement de la route Vercel `/api/ai/assistant/stream` (proxy vers edge ai-assistant). Actuellement peut retourner 502 « function not found » tant que non déployée. Le fallback edge direct fonctionne. Source : session développement continu (PROJECT_MEMORY).

## Cartographie des données (rappel)

Tables publiques : artist_follows, artists, event_artists, event_collaborators, event_comments, event_likes, event_live_links, event_questions, event_reactions, event_reports, event_schedule, event_sponsors, event_view_daily, events, example, notifications, organization_follows, organizations, profiles, ticket_options, tickets.

Projet Supabase actif : lwwiolbofrqakvrdvbbj.
