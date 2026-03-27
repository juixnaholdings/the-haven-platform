# Next.js Cutover Readiness

Date: 2026-03-27  
Branch: `feat/nextjs-migration`  
Wave: Milestone 6 (cutover-prep / QA)

## Recommended verdict

`Ready for staged cutover`

No blocking parity gaps remain across the migrated Phase 1 routes.  
Cutover should proceed as a staged rollout (staging rehearsal, canary, then full switch) with rollback kept available.

## Verification evidence

- Static checks passed in `frontend-next`:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- Added browser-level smoke coverage with mocked backend-contract responses:
  - `npm run test:smoke`
  - Coverage includes protected-route redirect, login flow, route sweep across all migrated routes, representative create flow, and role-aware audit visibility.
- Backend contracts remain unchanged in this wave; verification focuses on frontend parity and cutover readiness.

## Route parity status

| Route | Status | Verification |
| --- | --- | --- |
| `/login` | Parity achieved | Smoke (login flow) |
| `/dashboard` | Parity achieved | Smoke (login redirect + direct load) |
| `/members` | Parity achieved | Smoke route sweep |
| `/members/new` | Parity achieved | Smoke route sweep + create flow |
| `/members/[memberId]` | Parity achieved | Smoke route sweep |
| `/members/[memberId]/edit` | Parity achieved | Smoke route sweep |
| `/households` | Parity achieved | Smoke route sweep |
| `/households/[householdId]` | Parity achieved | Smoke route sweep |
| `/groups` | Parity achieved | Smoke route sweep |
| `/groups/[groupId]` | Parity achieved | Smoke route sweep |
| `/events` | Parity achieved | Smoke route sweep |
| `/events/[serviceEventId]` | Parity achieved | Smoke route sweep |
| `/attendance` | Parity achieved | Smoke route sweep |
| `/events/[serviceEventId]/attendance` | Parity achieved | Smoke route sweep |
| `/finance` | Parity achieved | Smoke route sweep |
| `/finance/entries/income` | Parity achieved | Smoke route sweep |
| `/finance/entries/expense` | Parity achieved | Smoke route sweep |
| `/finance/transfers/new` | Parity achieved | Smoke route sweep |
| `/finance/transactions/[transactionId]` | Parity achieved | Smoke route sweep |
| `/reports` | Parity achieved | Smoke route sweep |
| `/settings/roles` | Parity achieved | Smoke route sweep |
| `/settings/staff` | Parity achieved | Smoke route sweep |
| `/audit` | Parity achieved with role caveat | Smoke route sweep (admin) + hidden/403 behavior (non-admin) |

## Auth/session parity status

Status: `Parity achieved`

Verified behavior:

- Login works against the existing backend auth contract shape.
- Protected dashboard routes redirect unauthenticated sessions to `/login?next=...`.
- Session bootstrap still follows refresh-cookie + in-memory access-token model.
- Logout flow remains wired via existing auth endpoint semantics.
- Unauthorized admin access behavior is explicit (audit denied for non-admin role in smoke coverage).

## Visual/design parity status

Status: `Parity achieved with minor non-blocking polish caveats`

- Route-level layout, shell, and data surfaces remain aligned with the existing refined clerical-minimalism baseline.
- Shared primitives continue to be reused across all migrated routes.
- Stale milestone messaging was removed from login/not-found metadata copy.

## Known caveats

- Role definitions are intentionally read-only in product UI.
- Staff invite/onboarding lifecycle is out of scope for current backend contracts.
- Audit remains list-first; no export/forensic tooling is exposed.
- Finance reversal/void workflows remain out of scope.

## Blocker classification

### Blockers

- None identified for staged cutover.

### Non-blockers

1. Advanced settings governance workflows (role-definition mutation) remain intentionally excluded.
2. Advanced audit export/forensics remain intentionally excluded.
3. Live staging rehearsal is still required before production switch.

## Recommended rollout sequence

1. Run staging rehearsal with `frontend-next` as active frontend entrypoint using:
   - `docs/runbooks/nextjs-staged-cutover.md`
   - `docs/runbooks/nextjs-staging-verification-checklist.md`
2. Execute internal canary release (admin/staff cohort) with active monitoring.
3. Complete full cutover after canary acceptance window passes.

## Rollback philosophy

- Keep Vite frontend deployable during and after first Next cutover window.
- Use a fast frontend-entrypoint switchback path at deployment/ingress layer.
- Keep backend contracts unchanged; rollback is frontend-target switching only.

## Post-cutover verification checklist

Use `docs/runbooks/nextjs-staging-verification-checklist.md` as the live checklist baseline, then confirm:

1. Confirm login/logout and session refresh work on the target domain.
2. Confirm protected-route redirect behavior for unauthenticated users.
3. Verify dashboard, members, households, groups, events, attendance, finance, reports, settings, and audit route rendering.
4. Verify staff/role permissions behave as expected (including audit visibility restrictions).
5. Validate one representative mutation flow in production-like conditions (member create or staff update).
6. Confirm no regression in API envelope handling and unauthorized error handling.
