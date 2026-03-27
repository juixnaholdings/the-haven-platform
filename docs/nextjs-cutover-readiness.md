# Next.js Cutover Readiness

Date: 2026-03-27  
Migration branch: `feat/nextjs-migration`

## Verdict

`Ready with caveats`

The `frontend-next` app now has parity for the major Phase 1 product routes and backend contracts, including settings and audit surfaces.  
Cutover can proceed in a staged manner after staging rehearsal confirms runtime behavior and ops runbooks are updated for frontend entrypoint switching.

## Route parity assessment

Implemented in `frontend-next`:

- `/login`
- `/dashboard`
- `/members`
- `/members/new`
- `/members/[memberId]`
- `/members/[memberId]/edit`
- `/households`
- `/households/[householdId]`
- `/groups`
- `/groups/[groupId]`
- `/events`
- `/events/[serviceEventId]`
- `/events/[serviceEventId]/attendance`
- `/attendance`
- `/finance`
- `/finance/entries/income`
- `/finance/entries/expense`
- `/finance/transfers/new`
- `/finance/transactions/[transactionId]`
- `/reports`
- `/settings/roles`
- `/settings/staff`
- `/audit`

Parity status: core product routes are migrated.

## Auth and session parity

- Login/logout/me/refresh flows use existing Django auth contracts.
- Access token remains in memory with refresh-cookie bootstrap.
- Dashboard route group remains protected and redirects unauthenticated users to `/login`.

Status: parity achieved.

## Shell and navigation parity

- Shared sidebar/topbar shell is implemented for the dashboard route group.
- Settings and audit are now integrated into navigation.
- Audit link visibility remains role-aware (`Super Admin` / `Church Admin`).

Status: parity achieved.

## Settings/admin parity

- Roles page: API-backed, read-only role definition summary.
- Staff page: API-backed create/update + role assignment flow.
- Blocked capability messaging remains explicit for unsupported invite/governance workflows.

Status: parity achieved with intentional scope limits.

## Audit parity status

- `/audit` implemented against:
  - `GET /api/audit/events/`
  - `GET /api/audit/events/{audit_event_id}/`
- Supports list-first activity feed with filters and optional pagination.

Status: parity achieved for first-wave audit scope.

## Known backend caveats preserved in Next

- Role-definition mutation is intentionally not exposed.
- Staff invite/onboarding lifecycle is not exposed as a product flow.
- Audit remains list-first (no export pipeline / forensic tooling).
- Finance reversal/void workflows remain out of scope.

## Pre-cutover checks

1. Validate `frontend-next` build/lint/typecheck in CI and release pipeline.
2. Run staging smoke for all migrated routes with real auth and role variants.
3. Confirm same-origin API + refresh-cookie behavior in staging domain.
4. Verify 403/blocked-state handling for restricted admin/audit roles.
5. Confirm ops runbook includes frontend rollback toggle to Vite app.

## Recommended cutover sequence

1. Staging rehearsal with `frontend-next` as primary frontend while preserving Vite rollback path.
2. Production canary window (internal/admin users first).
3. Full cutover after canary acceptance and no critical auth/data regressions.

## Rollback philosophy

- Keep Vite frontend deployable until at least one stable release cycle passes on Next.
- Use a fast switchback mechanism at ingress/deployment level to return traffic to Vite.
- Do not change backend API contracts as part of rollback; frontend-only swap should be sufficient.
