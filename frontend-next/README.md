# Frontend Next (Parallel Migration App)

This folder contains the parallel Next.js App Router migration frontend for The Haven.

Current production/staging frontend remains the Vite app in `frontend/`.
This app is migration work only and is developed on the long-running branch:

- `feat/nextjs-migration`

## Milestone 4 scope

- App Router + TypeScript parallel migration app
- route groups for `(auth)` and `(dashboard)`
- authenticated shell parity foundation for the dashboard route group
- real login flow wired to Django auth endpoints
- real session bootstrap using secure refresh-cookie flow + access token in memory
- protected dashboard route behavior with unauthenticated redirect to `/login?next=...`
- backend-backed dashboard page wired to `/api/reports/dashboard/`
- migrated members parity routes:
  - `/members`
  - `/members/new`
  - `/members/:memberId`
  - `/members/:memberId/edit`
- migrated households parity routes:
  - `/households`
  - `/households/:householdId`
- migrated groups parity routes:
  - `/groups`
  - `/groups/:groupId`
- migrated events and attendance parity routes:
  - `/events`
  - `/events/:serviceEventId`
  - `/events/:serviceEventId/attendance`
  - `/attendance`
- migrated finance parity routes:
  - `/finance`
  - `/finance/entries/income`
  - `/finance/entries/expense`
  - `/finance/transfers/new`
  - `/finance/transactions/:transactionId`
- migrated reports parity route:
  - `/reports`
- shared list/detail/form/state primitives for migration waves:
  - `EntityTable`
  - `PaginationControls`
  - `StatusBadge`
  - `EmptyState`
  - `DetailPanel`
  - `FormSection`
  - `BlockedFeatureCard`

## Local usage

From `frontend-next/`:

```bash
npm install
npm run dev
```

App URL:

- `http://localhost:3000`

Required environment:

- copy `.env.example` to `.env.local`
- set `NEXT_PUBLIC_API_BASE_URL` to your Django backend (for local: `http://localhost:8000`)

Example:

```bash
cp .env.example .env.local
```

Validation commands:

```bash
npm run lint
npm run typecheck
npm run build
```

## Notes

- Current migrated routes in Next:
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
- Existing production/staging app remains the Vite frontend in `frontend/`.
- Milestone 5 starts settings and audit migration plus final parity/cutover verification.
