# Next.js Migration Plan

Date: 2026-03-27  
Branch: `feat/nextjs-migration`

## Why this migration exists

The current Vite frontend has broad product coverage and should remain stable during active operations.  
The Next.js migration exists to establish a durable App Router foundation for future growth (routing, layout composition, server/client boundaries, and deployment flexibility) without disrupting the current app.

## Branch strategy

- Use one long-running migration branch: `feat/nextjs-migration`
- Keep milestone commits grouped and reviewable on that branch
- Do not merge to `develop` or `main` until migration milestones are explicitly approved

## Parallel-app strategy

- Existing app remains at `frontend/` (Vite, current source of truth for active product use)
- New migration app lives at `frontend-next/` (Next.js App Router)
- Backend remains Django API source of truth
- No backend contract redesign is part of migration scaffolding

## Milestone sequence

1. Milestone 0 (this change): foundation scaffold
2. Milestone 1: auth/session wiring and protected-shell enforcement
3. Milestone 2: migrate members + households surfaces
4. Milestone 3: migrate groups + events + attendance
5. Milestone 4: migrate finance + reports + settings surfaces
6. Milestone 5: parity verification, controlled cutover plan, and rollback strategy

## Route migration plan

Milestone 0 routes in `frontend-next`:

- `/login`
- `/dashboard`

Planned migration order after auth/session wiring:

1. `/members`, `/members/new`, `/members/:memberId`, `/members/:memberId/edit`
2. `/households`, `/households/:householdId`
3. `/groups`, `/groups/:groupId`
4. `/events`, `/events/:serviceEventId`, `/events/:serviceEventId/attendance`
5. `/attendance`
6. `/finance`, `/finance/entries/income`, `/finance/entries/expense`, `/finance/transfers/new`, `/finance/transactions/:transactionId`
7. `/reports`
8. `/settings/roles`, `/settings/staff`
9. `/audit`

## Cutover philosophy

- Keep migration incremental and reversible.
- Preserve behavior parity with backend contracts before switching traffic.
- Delay deployment-infra cutover until route parity, auth parity, and test parity are verified.
- Maintain rollback option to Vite frontend until Next.js app is validated in staging.

## Milestone 0 completed

- Created `frontend-next/` with Next.js App Router + TypeScript
- Added route groups:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(dashboard)/dashboard/page.tsx`
- Added app-level foundation:
  - `src/app/layout.tsx`
  - `src/app/globals.css`
  - `src/app/error.tsx`
  - `src/app/not-found.tsx`
- Added migration-ready folders:
  - `src/components/`
  - `src/auth/`
  - `src/domains/`
  - `src/lib/`
  - `src/providers/`
  - `src/styles/`
  - `src/types/`
- Added environment template:
  - `frontend-next/.env.example`
- Added local usage notes:
  - `frontend-next/README.md`

## Milestone 1 next actions

- Port auth API client semantics from Vite app into `frontend-next`
- Implement session bootstrap (`/api/auth/me/` + refresh flow) in provider layer
- Enforce dashboard protection in `(dashboard)/layout.tsx`
- Replace preview-mode login with real login mutation handling
- Add shared request/error primitives for upcoming domain migrations
