# Next Frontend Staging Verification Checklist

Use this checklist for ongoing staging verification now that `frontend-next` is fully adopted.

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
- [ ] `/members` list/detail/create/edit paths work
- [ ] `/households` list/detail paths work
- [ ] `/groups` list/detail paths work
- [ ] `/events` list/detail paths work
- [ ] `/attendance` overview and event attendance paths work
- [ ] `/finance` overview and entry/transfer/detail paths work
- [ ] `/reports` loads expected summaries
- [ ] `/settings/roles` reflects read-only role definitions correctly
- [ ] `/settings/staff` supports backend-backed staff operations
- [ ] `/audit` loads for permitted roles and is restricted otherwise

## UX/system

- [ ] sidebar/nav active states are correct
- [ ] route-level loading/empty/error states render correctly
- [ ] no major layout regressions against baseline
- [ ] known caveats are represented honestly

## Network/console

- [ ] no recurring console runtime errors
- [ ] no repeated failed API requests after steady-state load
- [ ] no wrong-origin API calls
- [ ] auth requests follow `/api/auth/*` contract

## Caveat reminders (expected scope)

- role definitions are intentionally read-only
- staff invite lifecycle may remain out of scope
- audit remains list-first and limited
- finance reversal/void workflows may remain out of scope
- mocked smoke suite does not replace real-backend staging checks

## Verdict

- [ ] Pass
- [ ] Pass with caveats
- [ ] Fail (rollback/fix required)

Issues/caveats logged:

- `P0`:
- `P1`:
- `P2`:
