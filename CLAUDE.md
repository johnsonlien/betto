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
- Use TypeScript throughout unless told otherwise.

## Conventions

- **ORM**: Prisma (`@prisma/client` + `prisma` CLI), schema at `prisma/schema.prisma`, targeting the PostgreSQL datasource via `DATABASE_URL`. Use Prisma Migrate (`prisma migrate dev`) for all schema changes — no ad-hoc SQL/schema drift.
- **Auth**: Auth.js (NextAuth) with the Prisma adapter (`Account`/`Session`/`VerificationToken`/`User` models in `prisma/schema.prisma`). Default sign-in method is email magic link — "making an account" is just entering an email.
- **Roles**: `CollaboratorRole` enum — `OWNER` / `EDITOR` / `VIEWER` — on `CalendarCollaborator`. Only `EDITOR`/`VIEWER` are used for invites/share links; ownership isn't transferred that way.
- **Collaborator access model**:
  - `CalendarInvite` — targeted invite by email, one pending invite per (calendar, email), token-based, expires.
  - `CalendarShareLink` — generic per-role shareable link, revocable/regenerable (app logic keeps at most one active link per calendar+role).
  - A `VIEWER` link/invite grants read-only access with **no account required**. An `EDITOR` link/invite requires signing in (creating an account if new) before access is granted. This is the floor: editing a calendar always requires an account; viewing does not.
- Folder structure and styling are still undecided — document them here as they're chosen.
- Prefer server components and server actions for data access where Next.js makes that natural; keep client components limited to interactive UI (drag-and-drop, day focus view, map/pin interactions).
- Keep calendar/event/collaborator data model changes reflected in migrations, not ad-hoc schema drift.

## Working with this repo

- This is an early-stage project — expect to be scaffolding structure, not just editing existing code. Confirm significant architectural choices (ORM choice, auth provider, drag-and-drop library, map/pin library) with the user before committing to them if not already decided.
