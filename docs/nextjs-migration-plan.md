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

1. Milestone 0: foundation scaffold
2. Milestone 1: shell parity + auth entry parity + dashboard parity
3. Milestone 2: migrate members + households surfaces
4. Milestone 3: migrate groups + events + attendance
5. Milestone 4 (this change): migrate finance + reports surfaces
6. Milestone 5: migrate settings + audit surfaces, then run parity verification and controlled cutover planning

## Route migration plan

Milestone 4 active routes in `frontend-next`:

- `/login`
- `/dashboard`
- `/members`
- `/members/new`
- `/members/:memberId`
- `/members/:memberId/edit`
- `/households`
- `/households/:householdId`
- `/groups`
- `/groups/:groupId`
- `/events`
- `/events/:serviceEventId`
- `/events/:serviceEventId/attendance`
- `/attendance`
- `/finance`
- `/finance/entries/income`
- `/finance/entries/expense`
- `/finance/transfers/new`
- `/finance/transactions/:transactionId`
- `/reports`

Planned migration order after auth/session wiring:

1. `/settings/roles`, `/settings/staff`
2. `/audit`
3. final parity verification and staged cutover planning

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

## Milestone 1 completed

- Implemented a reusable Next auth API client aligned to existing backend contracts:
  - `POST /api/auth/login/`
  - `POST /api/auth/logout/`
  - `POST /api/auth/token/refresh/`
  - `GET /api/auth/me/`
- Added refresh-cookie-aware session bootstrap in the provider layer.
- Added protected dashboard shell behavior in `(dashboard)/layout.tsx` with unauthenticated redirect to `/login?next=...`.
- Replaced preview login with a real backend login flow.
- Replaced scaffold dashboard with a real backend-backed dashboard view using `GET /api/reports/dashboard/`.
- Added migration-ready shared modules for API errors, request handling, loading/error UI states, and basic dashboard presentation primitives.

## Milestone 2 completed

- Migrated members routes:
  - `/members`
  - `/members/new`
  - `/members/:memberId`
  - `/members/:memberId/edit`
- Migrated households routes:
  - `/households`
  - `/households/:householdId`
- Added reusable parity primitives in `frontend-next` for list/detail/form/state flows:
  - `EntityTable`, `PaginationControls`, `StatusBadge`, `EmptyState`, `DetailPanel`, `FormSection`, `BlockedFeatureCard`
- Aligned members and households list handling with backend optional pagination support (`page`, `page_size`) while preserving normalized list parsing.
- Kept parity with existing backend contracts and did not broaden migration to unrelated route domains.

## Milestone 3 completed

- Migrated groups/ministry routes:
  - `/groups`
  - `/groups/:groupId`
- Migrated event and attendance routes:
  - `/events`
  - `/events/:serviceEventId`
  - `/events/:serviceEventId/attendance`
  - `/attendance`
- Added groups and attendance domain API modules in `frontend-next` using the same backend contracts and response normalization patterns already used for members/households.
- Reused and extended existing shared parity primitives (`PageHeader`, `EntityTable`, `FormSection`, `StatusBadge`, `PaginationControls`, `Error/Loading/EmptyState`) instead of creating route-specific components.
- Kept backend contract alignment explicit:
  - groups remain a flat ministry analogue (no hierarchy behavior added)
  - attendance summary and member attendance are handled as distinct flows
  - no unsupported reconciliation logic was introduced.

## Milestone 4 completed

- Migrated finance routes:
  - `/finance`
  - `/finance/entries/income`
  - `/finance/entries/expense`
  - `/finance/transfers/new`
  - `/finance/transactions/:transactionId`
- Migrated reports route:
  - `/reports`
- Added finance domain API module and options for transactions/ledger direction in `frontend-next`.
- Extended shared typing and formatter foundations for finance/report contracts:
  - fund accounts
  - transactions and transaction lines
  - income/expense/transfer payloads
  - amount formatting helpers
- Kept finance/reporting caveats explicit and unchanged:
  - no reversal/void workflows
  - no fabricated transaction audit timeline
  - no fake export flows from reports.

## Milestone 5 next actions

- Migrate settings routes with current backend caveats:
  - `/settings/roles`
  - `/settings/staff`
- Migrate audit route:
  - `/audit`
- Complete final parity verification checklist and controlled cutover/rollback documentation.
