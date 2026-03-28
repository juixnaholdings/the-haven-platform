# The Haven Frontend (Primary)

`frontend-next/` is the canonical frontend for The Haven.

The old Vite app in `../frontend/` is kept only as a legacy snapshot for rollback/reference and is no longer the active frontend path.

## Stack

- Next.js App Router
- TypeScript
- React Query for domain data flows
- Backend-driven auth/session using:
  - `POST /api/auth/login/`
  - `POST /api/auth/token/refresh/`
  - `GET /api/auth/me/`
  - `POST /api/auth/logout/`

## Primary routes

- `/login`
- `/dashboard`
- `/members`, `/members/new`, `/members/:memberId`, `/members/:memberId/edit`
- `/households`, `/households/:householdId`
- `/groups`, `/groups/:groupId`
- `/events`, `/events/:serviceEventId`, `/events/:serviceEventId/attendance`
- `/attendance`
- `/finance`, `/finance/entries/income`, `/finance/entries/expense`, `/finance/transfers/new`, `/finance/transactions/:transactionId`
- `/reports`
- `/settings/roles`, `/settings/staff`
- `/audit`

## Local usage

From `frontend-next/`:

```bash
npm install
npm run dev
```

App URL:

- `http://localhost:3000`

Environment:

1. Copy `.env.example` to `.env.local`
2. Set local backend API URL:
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

## Canonical validation commands

```bash
npm run lint
npm run typecheck
npm run build
npm run test:smoke
```

## UI system conventions

- Page-level screens use a shared `PageHeader` pattern:
  - title + short supporting copy + right-side action area
- List-heavy screens use the shared `FilterActionStrip`:
  - left: search
  - middle: supported filters
  - right: primary reset/action control
- Data tables and pagination use `EntityTable` + `PaginationControls` with the shared list-card styling.
- Detail pages compose sections in this order:
  - summary/metrics first
  - metadata and related records next
  - supporting and blocked-capability notes last
- Status indicators should use `StatusBadge` tones for consistent cross-page state treatment.

## Caveats (intentional)

- Role definitions remain read-only in product UI.
- Staff invite lifecycle remains out of scope.
- Audit is list-first and intentionally limited.
- Finance reversal/void workflows remain out of scope.
