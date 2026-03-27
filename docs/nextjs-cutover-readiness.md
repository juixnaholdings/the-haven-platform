# Next.js Cutover Readiness

Date: 2026-03-27  
Branch: `feat/nextjs-migration`

## Verdict

`Ready for staged cutover execution`

Repo defaults now treat `frontend-next` as the primary frontend.  
Final go/no-go still depends on real staging rehearsal using the runbooks below.

## What is complete

- Full Phase 1 route parity exists in `frontend-next`.
- Auth/session flow remains backend-driven and contract-aligned.
- Primary CI frontend checks now target `frontend-next`.
- Local runbooks and operational docs now target `frontend-next`.
- Deployment/nginx references now route frontend traffic through Next.
- Legacy Vite app is explicitly decommissioned as active app and kept only as snapshot.

## Required staged execution

Use:
- `docs/runbooks/nextjs-staged-cutover.md`
- `docs/runbooks/nextjs-staging-verification-checklist.md`

Staging rehearsal must validate:
- auth/session continuity
- route-by-route functional behavior
- settings/audit role-aware behavior
- console/network stability
- rollback path

## Blocker classification

- `P0`: stop and rollback immediately
- `P1`: hold release and fix before progression
- `P2`: proceed only with explicit caveat acceptance

## Known caveats

- role definitions are intentionally read-only
- staff invite lifecycle remains out of scope
- audit remains list-first and limited
- finance reversal/void remains out of scope
- mocked smoke coverage supports confidence but does not replace real-backend staging rehearsal

## Rollback philosophy

- Keep legacy `frontend/` snapshot available for reference/rollback planning.
- Rollback should switch frontend target to last known-good reference and redeploy.
- Backend APIs remain unchanged across cutover/rollback.
