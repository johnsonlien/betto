# Betto

Betto ("Better Together") is a collaborative calendar for planning vacations and group events. Users create calendars, invite collaborators, and plan events across a range of dates together.

## Core features

- Create a calendar scoped to a date range (e.g. a trip's start/end dates)
- Invite other users to collaborate on a calendar
- Add events and pinned locations to specific days
- Focus/zoom into a single day's view
- Drag-and-drop events between days to reschedule
- View pinned locations (e.g. on a map) associated with the calendar

## Tech stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL
- **Maps**: MapLibre GL JS + OpenFreeMap tiles for pinned locations. Free, no API key or billing account required, and a drop-in swap to Mapbox later if needed (same API shape via `react-map-gl`). Avoid Google Maps to skip the mandatory billing-account requirement.
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix-based components copied into `components/ui/`, configured via `components.json`). No separate CSS Modules.
- **Drag-and-drop**: `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) for rescheduling events between day containers — chosen over `react-beautiful-dnd`/forks for multi-container support and touch/mobile input.
- **Transactional email**: Resend (`resend` package, also used as the Auth.js email provider for magic links). Chosen for a no-billing-required free tier, consistent with the maps choice above.
- Use TypeScript throughout unless told otherwise.

## Conventions

- **ORM**: Prisma (`@prisma/client` + `prisma` CLI), schema at `prisma/schema.prisma`, targeting the PostgreSQL datasource via `DATABASE_URL`. Use Prisma Migrate (`prisma migrate dev`) for all schema changes — no ad-hoc SQL/schema drift.
- **Auth**: Auth.js (NextAuth) with the Prisma adapter (`Account`/`Session`/`VerificationToken`/`User` models in `prisma/schema.prisma`). Default sign-in method is email magic link — "making an account" is just entering an email.
- **Roles**: `CollaboratorRole` enum — `OWNER` / `EDITOR` / `VIEWER` — on `CalendarCollaborator`. Only `EDITOR`/`VIEWER` are used for invites/share links; ownership isn't transferred that way.
- **Collaborator access model**:
  - `CalendarInvite` — targeted invite by email, one pending invite per (calendar, email), token-based, expires.
  - `CalendarShareLink` — generic per-role shareable link, revocable/regenerable (app logic keeps at most one active link per calendar+role).
  - A `VIEWER` link/invite grants read-only access with **no account required**. An `EDITOR` link/invite requires signing in (creating an account if new) before access is granted. This is the floor: editing a calendar always requires an account; viewing does not.
- **Event tags**: `EventCategory` enum (`LODGING`/`FOOD`/`ACTIVITY`/`TRANSPORT`/`OTHER`) — one optional category per event, not free-form multi-tag. Colors/labels centralized in `components/calendar/category.ts`.
- **Board layout**: an hourly time-grid, not a stacked card list. Events with a `startTime` are positioned/sized absolutely within a 24-hour grid (`components/calendar/day-grid.tsx`, `lib/calendar/time-grid.ts` — `HOUR_HEIGHT`/`GRID_HEIGHT` constants, `computeOverlapLayout` for splitting time-overlapping events into side-by-side columns); events with no `startTime` live in a separate fixed-height all-day list above the grid, ordered by `position` like before. The header+all-day zone's height (`TOP_ZONE_HEIGHT`) is fixed and identical across every day column so the shared hours axis (`hours-axis.tsx`) stays aligned with every column's grid. Dragging a timed event repositions it by time (snapped to 15 min, via `moveToGridSlot`); dragging into/out of the all-day zone sets/clears its time (`moveEvent`'s `clearTime` flag). There's no live shuffle-preview while dragging — only the final drop position is computed, to keep the grid-vs-list branching tractable.
- **Idea pool**: `Event.date` is nullable — `date: null` means an unscheduled "idea," not yet assigned a day or time (pool events never carry a `startTime`/`endTime` either; a time without a day is meaningless). Lives in `components/calendar/pool-panel.tsx`, toggled from a button in the board header (same row as the date range), and participates in the same `DndContext` as the day grid so ideas can be dragged onto a day (`moveEvent`/`moveToGridSlot`, unchanged) or back into the pool (`moveToPool`, which clears date+time). `CalendarBoard`'s `columns` state keys the pool under a reserved `"__pool__"` entry, treated as just another drop container alongside each day.
- **Creating a timed event by range-select**: in `day-grid.tsx`, pressing and dragging vertically on empty grid space (not on an existing event block) previews a time range live and, on release, shows a "+ Event" button that opens the create dialog prefilled with that start/end time (`EventDialog`'s `prefill` prop). A plain click (no drag) defaults to a 1-hour block. This is additive — the "Add event" button still exists for quickly adding an untimed/all-day event.
- **Pinning locations**: a location's lat/lng comes from typing an address and picking a result (`lib/actions/geocode.ts`, Nominatim/OpenStreetMap — free, no API key, pairs with the OpenFreeMap tiles already in use). Locations are reusable across events (`Location.events[]`); the board page's right-hand panel (`components/calendar/locations-panel.tsx`) plots all of a calendar's pinned locations on an actual MapLibre map, and can be filtered by highlighting one or more day columns. The panel is lazy-loaded (`next/dynamic`, `ssr:false`) so MapLibre isn't shipped to pages that never show it. `maplibre-gl/dist/maplibre-gl.css` is imported globally in `app/globals.css`, not inside the dynamically-loaded component — CSS from a `next/dynamic({ssr:false})` module isn't reliably injected, which silently broke the map's rendering once already.
- **Dev auth bypass**: in `auth.ts`, `auth()` skips real sign-in entirely whenever `NODE_ENV !== "production"` — every request is auto-authenticated as a fixed dev user (`DEV_USER_EMAIL`, default `dev@localhost`), logged loudly via `console.warn` whenever active. `npm run dev` never requires the magic-link flow. Never remove the `NODE_ENV === "production"` guard.
- **Folder structure**: standard Next.js App Router layout — `app/` for routes, `components/ui/` for shadcn components, `lib/` for shared server/client utilities (`lib/prisma.ts` is the Prisma client singleton), `auth.ts` at the repo root for the Auth.js config (App Router convention), `prisma/` for schema + migrations.
- Prefer server components and server actions for data access where Next.js makes that natural; keep client components limited to interactive UI (drag-and-drop, day focus view, map/pin interactions).
- Keep calendar/event/collaborator data model changes reflected in migrations, not ad-hoc schema drift.

## Working with this repo

- This is an early-stage project — expect to be scaffolding structure, not just editing existing code. Confirm significant architectural choices (ORM choice, auth provider, drag-and-drop library, map/pin library) with the user before committing to them if not already decided.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
