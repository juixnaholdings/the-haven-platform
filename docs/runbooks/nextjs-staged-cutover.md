# Next.js Staged Cutover Runbook (Historical Record)

## Status

This runbook is retained as a historical execution record.  
The staged cutover has already been completed and `frontend-next` is now the active frontend.

## Purpose now

- Preserve the original staged-cutover procedure for auditability.
- Reuse as a rehearsal template for future frontend platform replacements.

## Active operational runbooks

For current day-to-day operations, use:

- `docs/runbooks/deployment.md`
- `docs/runbooks/local-setup.md`
- `docs/runbooks/nextjs-staging-verification-checklist.md`

## Archived cutover summary

The cutover process covered:

1. Merge/update on `develop`
2. Staging deployment with compose
3. Immediate health checks (`/health/`, `/api/schema`, `/api/docs/`, `/login`)
4. Route-by-route functional verification
5. Blocker classification (`P0`, `P1`, `P2`)
6. Sign-off and rollback decision framework

## Blocker model retained for reference

- `P0`: stop and rollback
- `P1`: hold release and fix
- `P2`: proceed only with explicit caveat acceptance

## Caveat reminders retained for reference

- Role definitions are intentionally read-only.
- Staff invite lifecycle may remain out of scope.
- Audit is list-first and limited.
- Finance reversal/void workflows remain out of scope.
- Mocked smoke coverage is not a substitute for real-backend rehearsal.

## Rollback reference (unchanged principle)

If a frontend rollback is required:

1. Identify last known-good frontend reference.
2. Deploy that reference using the standard deployment runbook.
3. Re-verify `/login`, `/dashboard`, and one protected domain page.
4. Record reason and incident details.
