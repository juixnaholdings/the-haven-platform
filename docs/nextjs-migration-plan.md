# Next.js Migration Plan

Date: 2026-03-27  
Branch: `feat/nextjs-migration`

## Objective

Replace the old Vite frontend with `frontend-next` as the canonical frontend without changing backend API contracts.

## Branch strategy

- Long-running migration branch: `feat/nextjs-migration`
- Target integration branch: `develop`
- Production branch: `main`

## Current status

`frontend-next` is now the primary frontend in repo structure, CI defaults, local runbooks, and deployment references.

Legacy status:
- `frontend/` is retained as a legacy snapshot for rollback/reference only.
- It is no longer the active frontend path.

## Milestone history

1. Milestone 0: Next scaffold and App Router foundation
2. Milestone 1: shell/auth/dashboard parity
3. Milestone 2: members + households parity
4. Milestone 3: groups + events + attendance parity
5. Milestone 4: finance + reports parity
6. Milestone 5: settings + audit parity
7. Milestone 6: cutover-prep QA and smoke coverage
8. Milestone 7: staged cutover runbook/checklist execution path
9. Milestone 8: full replacement in repo/tooling/docs (this wave)

## Canonical frontend path (effective now)

- Active app: `frontend-next/`
- Canonical checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:smoke`

## Route coverage in primary frontend

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

## Deployment direction

- Staging/production frontend path is now aligned to `frontend-next` in compose/nginx references.
- Backend remains Django source of truth under existing API contracts.
- Staged cutover execution remains runbook-driven:
  - `docs/runbooks/nextjs-staged-cutover.md`
  - `docs/runbooks/nextjs-staging-verification-checklist.md`

## Honest caveats (unchanged)

- Role definitions remain read-only in product UI.
- Staff invite lifecycle remains out of scope.
- Audit remains list-first and limited in scope.
- Finance reversal/void workflows remain out of scope.
