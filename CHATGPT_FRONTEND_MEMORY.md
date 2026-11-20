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
