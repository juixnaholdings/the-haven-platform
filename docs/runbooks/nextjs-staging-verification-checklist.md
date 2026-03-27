# Next.js Staging Verification Checklist

Use this checklist during the staged rehearsal after deploying `develop` with Next cutover changes.

## Session metadata
- Date/time:
- Environment URL:
- Deployed `develop` SHA:
- Tester(s):

## Auth
- [ ] `/login` loads and submits successfully
- [ ] protected routes redirect unauthenticated users to login
- [ ] session persists after page reload
- [ ] logout clears session and returns to login

## Core pages
- [ ] `/dashboard` loads real reporting data
- [ ] `/members` list loads
- [ ] `/members/new` create flow succeeds
- [ ] `/members/{id}` detail loads
- [ ] `/members/{id}/edit` update flow succeeds
- [ ] `/households` list loads
- [ ] `/households/{id}` detail and membership paths load
- [ ] `/groups` list loads
- [ ] `/groups/{id}` detail loads
- [ ] `/events` list loads
- [ ] `/events/{id}` detail loads
- [ ] `/attendance` overview loads
- [ ] `/events/{id}/attendance` summary/member attendance flows load
- [ ] `/finance` ledger overview loads
- [ ] `/finance/entries/income` submit path works
- [ ] `/finance/entries/expense` submit path works
- [ ] `/finance/transfers/new` submit path works
- [ ] `/finance/transactions/{id}` detail loads
- [ ] `/reports` loads with expected summaries
- [ ] `/settings/roles` loads and clearly reflects read-only role definitions
- [ ] `/settings/staff` loads and backend-supported actions behave correctly
- [ ] `/audit` loads for permitted role and is restricted for non-permitted role

## UX/system
- [ ] sidebar/nav active states are correct
- [ ] no broken route-level loading/empty/error screens
- [ ] no major layout regressions against current staging baseline
- [ ] known caveats are represented honestly in UI copy

## Network/console
- [ ] no recurring console runtime errors after steady-state navigation
- [ ] no repeated failed API requests after load settles
- [ ] no wrong-origin API calls
- [ ] auth-related requests follow expected contract (`/api/auth/*`)

## Caveat reminders (non-blocker if expected)
- role definitions are intentionally read-only
- staff invite lifecycle may remain out of scope
- audit remains list-first and may be limited
- finance reversal/void workflows may remain out of scope
- mocked smoke suite does not replace this real-backend rehearsal

## Verdict
- [ ] Not ready (rollback required)
- [ ] Ready with caveats (explicit caveat acceptance required)
- [ ] Ready for staged cutover

Blockers/caveats logged:
- `P0`:
- `P1`:
- `P2`:

Sign-off:
- Release owner:
- Technical approver:
- Product/operations approver:
