# Next.js Staged Cutover Runbook

## Purpose
This runbook defines the exact staging cutover rehearsal process for confirming and operating the Next.js frontend (`frontend-next/`) as the active frontend.

## Scope
- Environment: staging only
- Target: frontend cutover validation against real Django backend
- Excludes: production cutover execution

## Branch model reminder
- `main` = production
- `develop` = staging/integration
- `feat/nextjs-migration` = long-running migration branch

## Preconditions
- `docs/nextjs-cutover-readiness.md` verdict is at least `Ready for staged cutover`.
- `frontend-next` checks are green on the migration branch:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:smoke`
- Staging deploy secrets and env files are present and current.
- Rollback reference is identified before cutover (commit SHA or tag).
- Operator has staging deploy access and approval to merge to `develop`.

## Step 1: Merge to `develop` for staged rehearsal
Preferred path: GitHub PR merge from `feat/nextjs-migration` to `develop`.

Local exact merge fallback:

```bash
git fetch origin
git checkout develop
git pull --ff-only origin develop
git merge --no-ff origin/feat/nextjs-migration -m "chore(nextjs): stage cutover rehearsal merge"
git push origin develop
```

Record the resulting `develop` commit SHA in the cutover record template below.

## Step 2: Deploy staging
Follow the existing staging deployment flow:

```bash
ssh <staging-host>
cd /srv/the-haven-staging
git fetch origin
git checkout develop
git pull --ff-only origin develop
docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml up --build -d
```

## Step 3: Immediate health verification
Run immediately after deployment:

1. Confirm reverse proxy and app are reachable at staging URL.
2. Confirm backend health endpoint returns success (`/health/`).
3. Confirm schema/docs endpoint is reachable (`/api/schema` and `/api/docs/`).
4. Confirm login page renders from the Next frontend entrypoint.

If any immediate health check fails, classify as blocker and rollback.

## Step 4: Real-backend verification procedure
Use `docs/runbooks/nextjs-staging-verification-checklist.md` live during rehearsal.

Mandatory coverage:

1. Auth/session:
   - login/logout
   - session bootstrap after reload
   - unauthorized redirect handling
2. Dashboard:
   - dashboard loads with real reporting payload
3. Members:
   - list/detail/create/edit
4. Households:
   - list/detail/membership management path
5. Groups:
   - list/detail/membership visibility
6. Events:
   - list/detail
7. Attendance:
   - overview and event attendance recording
8. Finance:
   - ledger, income, expense, transfer, transaction detail
9. Reports:
   - reports page with date-filter-capable summaries
10. Settings:
    - roles page (read-only role definitions)
    - staff page (backend-supported operations only)
11. Audit:
    - list-first audit feed behavior and role-aware access
12. UX/system integrity:
    - shell/nav consistency
    - route-level loading/empty/error behavior
13. Console/network sanity:
    - no recurring frontend runtime errors
    - no repeated failed API requests after stable load
    - no mixed-origin request drift

## Step 5: Blocker classification
- `P0 blocker` (stop + rollback):
  - auth/session broken
  - core protected routes unusable
  - major data actions fail across multiple domains
  - severe runtime instability
- `P1 blocker` (hold for fix before progressing):
  - single domain materially degraded for normal operations
  - repeated server/client errors with no workaround
- `P2 non-blocker` (allow staged progression with caveat):
  - minor visual drift
  - low-impact UX inconsistency
  - known out-of-scope constraints already documented

Known caveat reminders:
- role definitions are intentionally read-only
- staff invite lifecycle may be out of scope
- audit is list-first and may remain limited
- finance reversal/void workflows may remain out of scope
- mocked smoke coverage is not a substitute for real-backend rehearsal

## Step 6: Sign-off decision
Choose one and record it:
- `Not ready` -> rollback now, create blocker issue list
- `Ready with caveats` -> proceed only if caveats are explicitly accepted
- `Ready for staged cutover` -> continue to staged canary / production consideration track

Required sign-off roles:
- release owner
- technical approver
- product/operations approver

## Step 7: Rollback procedure
If blockers are hit:

1. Identify last known-good frontend reference (pre-cutover SHA/tag).
2. Restore staging frontend entrypoint to the previous known-good legacy reference and redeploy that ref.
3. Re-run immediate health verification.
4. Confirm login, dashboard, and one representative protected domain page are back to stable behavior.
5. Record rollback reason and blocker details.

Use existing deployment runbook for environment commands: `docs/runbooks/deployment.md`.

## Step 8: Staging cutover record template
Fill this during rehearsal:

- Date/time:
- Environment URL:
- `develop` commit SHA deployed:
- Previous known-good SHA/tag:
- Release owner:
- Approvers:
- Result:
  - [ ] Not ready
  - [ ] Ready with caveats
  - [ ] Ready for staged cutover

Verification summary:
- Auth/session:
- Dashboard:
- Members:
- Households:
- Groups:
- Events:
- Attendance:
- Finance:
- Reports:
- Settings:
- Audit:
- UX/system integrity:
- Console/network sanity:

Blockers/caveats:
- `P0`:
- `P1`:
- `P2`:

Rollback executed:
- [ ] Yes
- [ ] No

Notes:

## Step 9: Exit criteria for production consideration
Do not consider production cutover until all are true:

- staged rehearsal completed with no `P0`/`P1` blockers
- sign-off result is `Ready for staged cutover` or accepted `Ready with caveats`
- rollback path was validated and documented
- open caveats are explicitly accepted by release owner and approvers
- post-cutover verification checklist is agreed for production rollout
