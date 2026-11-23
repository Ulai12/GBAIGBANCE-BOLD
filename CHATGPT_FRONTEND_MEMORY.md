# CHATGPT_FRONTEND_MEMORY.md

## GBAIGBANCE-BOLD — ChatGPT frontend handoff

- Repository: `Ulai12/GBAIGBANCE-BOLD`
- Exclusive writing branch: `FRONTEND-iA` (GitHub branch spelling/case).
- Never write to `main`, merge, or open a PR unless the user explicitly asks.
- Never modify Grok/other-agent memory such as `PROJECT_MEMORY.md`.
- Preserve existing work; inspect current files and diff before editing.
- Do not change the Explorer page or category-card design. Preserve the existing main-category → subcategory hierarchy.
- Use existing components, design tokens, translations, and `cn` helper where appropriate. Keep French and English, light and dark themes, responsive behavior, accessible controls, and reduced-motion support.
- Project workflow constraints: npm only; use `npm ci` when install is required; do not use `npm install`, `npm update`, or `npm audit fix`; do not alter package manifests or lockfiles without explicit approval.

## Current task: Create Event UX

- User approved improving the event creation page based on their supplied iPhone UI reference.
- Initial code inspection on `FRONTEND-iA`: `src/screens/CreateEventWizardScreen.tsx`, `src/features/events/mutations.ts`, and `src/types/index.ts`.
- Existing wizard has nine stages: Infos, Lieu & Dates, Photos, Billets, Collaborateurs, Programme, Live, Sponsors, Confirmation.
- Existing capabilities include hierarchical categories, venue/address/city/country/GPS, start/end dates, cover/gallery/video, GBAIGBANCE tickets/free/WhatsApp/external access, capacity, collaborators, schedule, live links, sponsors, preview and confirmation.
- Location currently uses manual venue/address fields, city/country selects, preset city coordinates, and optional browser geolocation. No interactive map/geocoding integration was identified in the inspected code. Do not represent creator GPS or city presets as verified venue coordinates.
- Event creation persists the primary event and then related ticket options/collaborators; schedule/live/sponsors are separate follow-up operations. Investigate partial-creation risk before refactoring.
- Without collaborators, current mutation sets status to `published`; with collaborators, `pending`. Preserve and communicate actual backend status.
- Persistent draft saving was not identified in the inspected mutation. Do not promise it until implemented and verified.
- Avoid schema changes unless required, inspected, and explicitly validated.

## Canonical task brief

See `docs/CREATE_EVENT_UX_VISION.md` for the full product vision, verified current-state notes, location model, business validations, agent work split, QA checklist, and definition of done.

## Latest documentation commit

- `fafff09f410db066c2d31f3c2197f4c1a4ffba15` — added `docs/CREATE_EVENT_UX_VISION.md` on `FRONTEND-iA`.

## Progress update — 2026-11-20

- First implementation pass completed on `src/screens/CreateEventWizardScreen.tsx`:
  - Venue GPS coordinates no longer default to Lomé's city-centre coordinates.
  - Changing the city, country, venue name, or venue address clears coordinates to prevent stale venue pins.
  - GPS helper text now explains in French and English that the current device position should only be used when physically at the event venue.
  - End date/time must be valid and later than start date/time.
  - Limited capacity must be a positive integer.
  - Native ticket prices must be valid and non-negative; quantities must be positive integers; sum of ticket quantities cannot exceed limited event capacity.
- FR/EN locale files updated for the GPS helper.
- Related progress and commit journal recorded in `docs/CREATE_EVENT_UX_VISION.md`.
- Vercel preview for the latest implementation commit was BUILDING when checked; do not claim build passed until status is READY and checks succeed.
- Important repository context: compare `main...FRONTEND-iA` showed the branch diverged (81 commits ahead, 18 behind at the time of inspection). Do not merge or rebase automatically; preserve branch history and review this divergence before any future PR.
- Remaining: full visual redesign, full schema/migration audit, functional/visual QA, deployment verification.

- Additional validation: a ticket whose type is `free` must have a zero price.
- Confirmation copy no longer promises instant publication; FR/EN copy now explains that events with collaborators may require approval.
- Build observation from the earlier preview logs: Vercel emitted a TypeScript TS5097 error in `api/ai/assistant/stream.ts(1,25)` due to a `.ts` import extension without `allowImportingTsExtensions`, although the log also printed “Build Completed”. Treat the latest deployment as unverified until its final state/logs are checked. This issue is outside the event wizard; do not change it without checking ownership and scope.

- Further access validation: reject blank ticket price/quantity values; free ticket types must be priced at zero; WhatsApp contact must contain 8–15 digits; external ticket URLs must parse as HTTP(S).
- Latest event validation code commit: `98c680abc2d0bdb7c5bb0000e22dfaba7e0f91f5`.

## Progress update — 2026-11-20 — UX redesign tranche 2

- Updated `src/screens/CreateEventWizardScreen.tsx` on `FRONTEND-iA`:
  - Added an immersive cover hero at the first Infos step with image selection/change, title preview, and upload-size guidance.
  - Grouped title, category hierarchy, description and capacity into visual cards without changing the category hierarchy.
  - Added a three-phase progress indicator while retaining all nine existing wizard steps and their order.
  - Added a sticky mobile action area with minimum 48px primary controls and safe-area bottom padding.
  - Added a Google Maps search link assembled from the venue name, address, city and country. It only opens a search; it does not geocode, verify the venue, or fill GPS coordinates.
- Updated FR/EN event locale files with phase, cover and map-search labels.
- Vercel Preview for commit `a74930e2a3b48aa308f9ba8e84f0f4c325950476` reached READY. Vite reported 3303 modules transformed and built in 3.68s. Logs still include unrelated TS5097 at `api/ai/assistant/stream.ts(1,25)`; deployment nevertheless completed READY.
- Branch comparison at the latest check: FRONTEND-iA ahead 101, behind 18 vs main. Do not merge/rebase without a reviewed plan.
- Browser screenshot/interactive visual QA could not be completed because the Browser session was unavailable. Manual mobile QA is still required.
- Full progress/limitations are in `docs/CREATE_EVENT_UX_VISION.md` section 11.


## Progress update — 2026-11-20 — build fix + ticketing/team UX tranche

- Fixed the confirmed Vercel TypeScript import-path issue in `api/ai/assistant/stream.ts`: final re-export path is `../../ai-assistant.js`, which is ESM-compatible and TypeScript resolves to the `.ts` source. The first extensionless attempt produced TS2835 under Node16 resolution, so do not revert to extensionless. No package manifest, dependency or lockfile changes.
- Ticketing UI in `src/screens/CreateEventWizardScreen.tsx`:
  - Added derived summary metrics for named ticket formulas, configured seat quantities, and minimum configured price.
  - Added a clearer ticket-card hierarchy, localized ticket type/name/price/quantity labels, and an optional ticket description field that uses the existing payload property.
  - Empty unnamed ticket rows are excluded from the seat total.
  - Existing access modes and backend mutation remain unchanged.
- Collaborator UI:
  - Added stale-response protection to debounced artist/organization searches.
  - Search results show available artist photos / organization logos and visibly disable the current account or already selected collaborators.
  - Selected collaborators are shown as accessible removable rows with their role.
  - Added localized explanation that events with collaborators remain pending until invitations are accepted.
- FR/EN locale files updated.
- Latest code commit before docs: `e41362ad60fca6fe37020d71d97d6148fbf4bdad`.
- Vercel deployment `dpl_6PPSLxAbvrtauAeMx76Px3ftGDcF` was QUEUED at the last check. Do not claim the TS5097 error is resolved in deployment until this exact commit reaches READY and logs are inspected.
- Detailed notes are in `docs/CREATE_EVENT_UX_VISION.md` section 12.
- No Supabase schema, creation mutation, status logic, package manifest or lockfile was changed.

- Final ESM re-export correction commit: `0738c8277845bd5d4210955888cd7e69b87e2bb6`; Vercel preview was BUILDING at last check. Verify latest deployment logs for absence of TS5097/TS2835 before marking the build issue closed.

- Verification update: Vercel deployment for code commit `0738c8277845bd5d4210955888cd7e69b87e2bb6` reached READY; build completed in 3.18s and logs contained neither TS5097 nor TS2835. Later commit `20b6f02b33b0c386aac914e08d7b8a70e6df9416` only updated handoff documentation.

- Build pipeline constraint: repository currently contains only `bun.lock` and no `package-lock.json`/npm-shrinkwrap. Vercel therefore auto-detects Bun and runs `bun install`. Do not set Vercel installCommand to `npm ci` until an npm lockfile is created with explicit owner approval. No lockfiles or package manifests were changed.

- 2026-11-20 tranche 4: redesigned `src/components/EventOptionalSteps.tsx` for Schedule, Live and Sponsors with mobile-first cards, dark mode, accessible controls and FR/EN translations.
- Schedule slots now expose title, day label, stage, start and end; incomplete optional slots remain skipped, but complete slots with invalid or reversed times are rejected in `CreateEventWizardScreen.validateCurrentStep`.
- Live step has an accessible switch, six platform choices, optional titles and HTTP(S) URL validation when a URL is entered. Enabling live without a link remains allowed; no placeholder link is persisted.
- Sponsors step has tier selectors, website and manual logo URL fields with preview, HTTP(S) validation, and manual-logo priority over website favicon fallback.
- No schema, package manifest, dependency or lockfile changes. Existing Supabase insert functions remain unchanged.
- FR/EN locale parity checked for all newly introduced optional-step keys.
- Code commit `312bbed8e78c6c873e9717ed91839a1e299f59cb`; Vercel preview deployment `dpl_5KycE23oGTE7DjgxVwnZg6ujN4p8` was QUEUED at last check. Verify READY and build logs before closing this tranche.
- Full browser/mobile visual QA and real end-to-end event creation remain outstanding.

- Deployment verification update: Vercel preview for code commit `312bbed8e78c6c873e9717ed91839a1e299f59cb` reached READY; Vite build 3.47s, deployment completed in 9s. Documentation-only follow-up commits `3b5dc8e295d54c91d6162b41911d6e71a0518399` and `dceea27212091b4c4030080af802fa20b9ad07ef` record tranche notes. Branch compare now reports 127 ahead / 18 behind main; do not merge/rebase automatically.


## 2026-11-20 — Création d’événement : confirmation et échecs partiels
- Branche d’écriture : `FRONTEND-iA` uniquement. Aucun changement sur `main`, catégories, schéma Supabase, API ou dépendances.
- `src/screens/CreateEventWizardScreen.tsx` : les uploads de couverture et de galerie sont désormais traités comme des éléments facultatifs. Un échec d’upload est collecté au lieu d’interrompre la création de l’événement.
- Après la création principale, les opérations de programme, liens Live et sponsors sont exécutées indépendamment via `Promise.allSettled`. Les erreurs partielles sont regroupées par section et signalées par un toast informatif ; l’événement créé est tout de même transmis à `onCreated`, évitant de présenter une publication réussie comme un échec complet.
- Écran Confirmation : ajout d’un panneau de préparation et de compteurs pour billets, programme, liens Live et sponsors, avec styles clair/sombre et grille responsive.
- Commits : `a6ebca7307701d1d039233f25460acb91b40edbd` (gestion des échecs partiels), `59e514142d2eb3589f05f3db20f8ec7602bb565f` (confirmation).
- Déploiement Preview Vercel : `dpl_4n56mrEWEUdf15N4tvTFuaEfhsGx`, URL `https://gbaigbance-event-9q0am72f1-shogun10.vercel.app`, état en cours de build au moment de cette note.
- À faire : attendre le résultat du build, puis vérifier le parcours sur mobile et contrôler dans la fiche créée que les sections facultatives sont effectivement persistées. Cette session n’a pas réalisé de création réelle en production ni de vérification de persistance en base.


## 2026-11-20 — Contrôle approfondi de la création et persistance partielle
- Vérification du code réel dans `src/features/events/mutations.ts` : découverte d'un défaut important. Après insertion de la ligne `events`, un échec d'insertion dans `ticket_options` ou `event_collaborators` levait une exception. Le wizard affichait alors un échec alors que l'événement existait déjà, avec risque de doublon si l'organisateur recommençait.
- Correctif : le service conserve l'événement créé et retourne des avertissements `creationWarnings` pour les étapes secondaires. Un échec de création des billets tente de faire passer l'événement en statut `pending` afin qu'il ne soit pas présenté comme prêt à vendre. Les invitations échouées sont également signalées.
- `CreateEventWizardScreen.tsx` récupère ces avertissements et les fusionne avec les erreurs des photos, du programme, des liens Live et des sponsors. L'organisateur voit un message partiel et l'événement n'est pas recréé par erreur.
- Commits : `5118143e6bb5b4955a9a126388a8eca868aa4db2` (service) et `22cba4f339ccdfeea09a9b5800c7b1a0e7af2e43` (wizard).
- Limite de vérification : les requêtes Supabase sont confirmées par lecture du code, mais aucun test d'écriture en base ni création réelle n'a été exécuté dans cette session. Aucun changement de schéma Supabase.


## 2026-11-23 — Découverte premium : cartes, À la une et Tendances
- Recherche de référence : Apple HIG Materials/Liquid Glass (réserver le matériau aux contrôles/navigation, garder le contenu lisible) ; web.dev INP et guide d'animations (réduire le travail des interactions, privilégier transform/opacity, respecter reduced motion).
- `src/components/FeaturedCarousel.tsx` : hero mobile plus immersif au format portrait, ratio paysage conservé sur écran large, contraste du dégradé renforcé, contour et profondeur plus subtils. Navigation, autoplay, données et callbacks inchangés.
- `src/components/EventCard.tsx` : cartes plus éditoriales (rayon, proportions, bordure, ombre et respiration du contenu), contraste du voile et accent violet éclairci. Données, prix, partage, favoris et statut inchangés.
- `src/components/TrendingDeck.tsx` et `TrendingDeckCard.tsx` : pile limitée à deux cartes pour réduire le coût de rendu ; correction du swipe dont les contraintes de ±30 px empêchaient d'atteindre le seuil de déclenchement de 80 px ; déplacement borné à ±280 px et élasticité réduite.
- Commits sur `FRONTEND-iA` : `bf9d4d5`, `d2e4fd4`, `f3dc788`, `7eaf96a`.
- Aucun changement de « Explorer par catégorie », navigation, logique de réservation, API, schéma Supabase, dépendance ou lockfile.
- Validation restant à faire : build Preview, typecheck/lint et QA visuelle/tactile réelle sur mobile. Ne pas déclarer les modifications validées avant ces contrôles.
