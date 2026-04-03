# Frontend Integration Runbook

## Purpose

Operational reference for the active frontend integration path in The Haven.

## Active frontend

- Canonical app: `frontend-next/`
- Legacy snapshot only: `frontend/` (inactive)

## API base URL strategy

- Env file: `frontend-next/.env.local`
- Template: `frontend-next/.env.example`
- Primary variable: `NEXT_PUBLIC_API_BASE_URL`

Recommended values:
- local backend: `http://localhost:8000`
- staging/prod behind same-origin proxy: leave unset (same-origin default)

## Auth/session flow (active behavior)

1. Optional public sign-up:
   - `POST /api/auth/signup/` with `{ username, email, password, confirm_password }`
   - `GET /api/auth/availability/username/` and `GET /api/auth/availability/email/` for pre-submit availability checks.
2. `POST /api/auth/login/`
   - Canonical request body: `{ identifier, password }`, where `identifier` can be username or email.
   - Legacy `{ username, password }` remains accepted for compatibility.
3. Access token stored in memory for active browser session.
4. Session bootstrap calls `POST /api/auth/token/refresh/` when needed (refresh cookie path), then `GET /api/auth/me/`.
5. Protected requests attach `Authorization: Bearer <access>`.
6. If refresh fails, session is cleared and protected routes redirect to `/login`.

## Domain API modules (active)

- `frontend-next/src/domains/auth/`
- `frontend-next/src/domains/members/`
- `frontend-next/src/domains/households/`
- `frontend-next/src/domains/groups/`
- `frontend-next/src/domains/attendance/`
- `frontend-next/src/domains/finance/`
- `frontend-next/src/domains/reporting/`
- `frontend-next/src/domains/users/`
- `frontend-next/src/domains/audit/`

## Attendance Sunday-service shortcut

- `GET /api/attendance/sunday-service/current/` is the frontend shortcut endpoint for Sunday attendance flows.
- The backend ensures system-managed Sunday service records before returning this payload.
- `frontend-next` attendance and events screens use this to surface a direct "Sunday attendance" action without requiring manual weekly event creation.

## Attendance reporting Sunday metrics

- `GET /api/reports/attendance/` now includes `sunday_services` in addition to aggregate attendance totals.
- The `sunday_services` block provides:
  - operational counts (`total_services`, `with_summary_count`, `with_member_records_count`)
  - workflow status counts (`fully_recorded_count`, `partially_recorded_count`, `not_started_count`)
  - `latest_service` and `recent_services` snapshots with `attendance_state` (`RECORDED`, `IN_PROGRESS`, `NOT_STARTED`).
- `frontend-next` uses this block on attendance/reporting screens to show "take vs continue" Sunday attendance workflows.

## Verification commands

Run from `frontend-next/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`
