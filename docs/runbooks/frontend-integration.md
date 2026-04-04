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
2. Optional public staff-invite onboarding:
   - `GET /api/auth/staff-invites/{staff_invite_id}/validate/?token=...` to validate invite links.
   - `POST /api/auth/staff-invites/{staff_invite_id}/accept/` to complete onboarding.
   - Frontend route: `/staff-invite/{staff_invite_id}?token=...`.
3. `POST /api/auth/login/`
   - Canonical request body: `{ identifier, password }`, where `identifier` can be username or email.
   - Legacy `{ username, password }` remains accepted for compatibility.
4. Access token stored in memory for active browser session.
5. Session bootstrap calls `POST /api/auth/token/refresh/` when needed (refresh cookie path), then `GET /api/auth/me/`.
6. Protected requests attach `Authorization: Bearer <access>`.
7. If refresh fails, session is cleared and protected routes redirect to `/login`.

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

## Modal-first form rule (current wave)

- Product forms in protected areas are now modal-first where practical; public auth pages (`/login`, `/signup`) remain page forms by design.
- Modal-first parity now includes:
  - staff lifecycle actions (`/settings/staff`) for invite, create, elevate, and manage/edit.
  - group and household detail management for record edits and membership add/edit flows.
  - finance ledger quick actions for income, expense, and transfer capture, plus transaction metadata edits.
- Shared attendance modals live in `frontend-next/src/domains/attendance/components/`.
- Dashboard quick actions are now wired:
  - `Add Event` opens the shared create-event modal.
  - `Record Attendance` opens the shared record-attendance modal.
- Some protected form routes remain as technical fallbacks (`/finance/entries/*`, `/finance/transfers/new`, `/members/new`, `/members/[id]/edit`) but primary CTAs now favor modal workflows.

## Attendance modal workflow (current behavior)

- The shared "Record Attendance" modal captures event details and attendance details in one user activity.
- Submission sequence is frontend-orchestrated:
  1. create event
  2. save summary attendance
  3. save member attendance rows
- If summary/member writes fail after event creation, the UI reports the partial state and links directly to `/events/{id}/attendance` to continue safely.

Attendance and reporting are now intentionally general-purpose (non-Sunday-specialized). Event records and attendance summaries are surfaced uniformly across events pages, attendance pages, and reports.

## Staff lifecycle integration

- Admin settings screen (`/settings/staff`) now includes:
  - active staff directory and role assignment
  - basic-user elevation candidates from public signup
  - staff invite lifecycle list (create/copy/revoke)
- Public signup users remain roleless/basic until explicit admin elevation.
- Invite onboarding is intentionally link-based in this wave (manual sharing); no outbound email coupling is required.

## Verification commands

Run from `frontend-next/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`
