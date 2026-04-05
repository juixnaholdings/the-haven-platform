# Next.js Cutover Readiness (Final)

Date: 2026-03-27  
Status: Cutover completed

## Verdict

`Cutover complete: frontend-next is fully adopted as primary frontend`

Production cutover has passed and the repository defaults now align with that adopted state.

## What is now true

- Full Phase 1 route parity is running from `frontend-next`.
- Auth/session behavior remains backend-driven and contract-aligned.
- CI/frontend validation targets `frontend-next`.
- Infra/nginx/deploy references route frontend traffic to the Next app.
- Runbooks and local usage instructions default to `frontend-next`.
- `frontend/` remains only as a legacy rollback/reference snapshot.

## Ongoing operational checks

Use these for routine staging/production confidence checks:

- `docs/runbooks/deployment.md`
- `docs/runbooks/local-setup.md`
- `docs/runbooks/nextjs-staging-verification-checklist.md`

## Historical cutover record

The staged cutover procedure remains documented for audit/history and future platform replacement rehearsals:

- `docs/runbooks/nextjs-staged-cutover.md`

## Known caveats (product scope)

- Role definitions are intentionally read-only.
- Staff invite lifecycle remains out of scope.
- Audit remains list-first and limited.
- Finance reversal/void remains out of scope.

## Rollback posture

- Legacy `frontend/` snapshot is retained for rollback/reference planning.
- Rollback should restore a last known-good frontend reference and redeploy.
- Backend APIs remain unchanged across rollback scenarios.
