# Frontend Implementation Map

Date: 2026-03-27

## Status

- Primary frontend: `frontend-next/` (active)
- Legacy snapshot: `frontend/` (inactive/deprecated)

This map now reflects the post-replacement state where Next.js is the canonical frontend.

## Route map (active frontend)

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
- `/settings`
- `/settings/roles`
- `/settings/staff`
- `/audit`

## Frontend architecture (active)

- `frontend-next/src/api/` shared API client + query client + envelope/error handling
- `frontend-next/src/auth/` session provider, storage, protected shell logic
- `frontend-next/src/domains/` per-domain APIs and route-level screens
- `frontend-next/src/components/` shared UI primitives
- `frontend-next/src/app/` App Router routes and layouts

## Shared primitives (active)

- `PageHeader`
- `StatusBadge`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `EntityTable`
- `DetailPanel`
- `FormSection`
- `StatCard`
- `PaginationControls`
- `BlockedFeatureCard`

## Screen-to-endpoint alignment (active)

- Auth/session: `/api/auth/*`
- Dashboard/reports: `/api/reports/*`
- Members: `/api/members/*`
- Households: `/api/households/*`
- Groups: `/api/groups/*`
- Events/attendance: `/api/attendance/*`
- Finance: `/api/finance/*`
- Settings: `/api/settings/*`
- Audit: `/api/audit/*`

## Primary validation commands

Run from `frontend-next/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`

## Legacy frontend policy

- `frontend/` is no longer used as the active product frontend.
- It remains in-repo only as a legacy snapshot for rollback/reference.
