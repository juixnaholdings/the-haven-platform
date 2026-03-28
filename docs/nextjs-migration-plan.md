# Next.js Migration Plan (Completed)

Date: 2026-03-27  
Status: Completed

## Objective

Replace the old Vite frontend with `frontend-next` as the canonical frontend without changing backend API contracts.

## Outcome

The migration has been completed and adopted:

- Active frontend: `frontend-next/`
- Legacy snapshot only: `frontend/`
- CI frontend checks target `frontend-next`
- Infra/deployment frontend path targets `frontend-next`
- Runbooks and local setup docs now default to `frontend-next`

## Milestone record

1. Milestone 0: Next scaffold and App Router foundation
2. Milestone 1: shell/auth/dashboard parity
3. Milestone 2: members + households parity
4. Milestone 3: groups + events + attendance parity
5. Milestone 4: finance + reports parity
6. Milestone 5: settings + audit parity
7. Milestone 6: cutover-prep QA and smoke coverage
8. Milestone 7: staged cutover runbook/checklist execution path
9. Milestone 8: repo/tooling/docs replacement finalization

## Primary frontend routes (post-cutover)

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

## Canonical frontend checks

Run from `frontend-next/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`

## Legacy policy

- `frontend/` remains in-repo as a legacy snapshot for rollback/reference.
- It is not part of active CI/deploy defaults.

## Remaining product caveats (not migration blockers)

- Role definitions remain read-only in product UI.
- Staff invite lifecycle remains out of scope.
- Audit remains list-first and limited.
- Finance reversal/void workflows remain out of scope.
