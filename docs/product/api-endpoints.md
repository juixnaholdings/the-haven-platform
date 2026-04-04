# API Authentication Endpoints

All API routes are mounted under the configured API prefix, which defaults to `/api/`.

## Schema and Docs

- `GET /health/`
  Returns a lightweight health payload, verifies database connectivity, and remains available for staging health checks even when SSL redirect is enabled.
- `GET /api/schema`
  Returns the OpenAPI schema document.
- `GET /api/schema/`
  Returns the OpenAPI schema document.
- `GET /api/docs/`
  Returns the interactive Swagger UI for the backend API.

## Public Auth Endpoints

- `POST /api/auth/login/`
  Accepts `{ "identifier": "<username-or-email>", "password": "<password>" }` as the canonical payload and also supports legacy `{ "username": "...", "password": "..." }` clients.
  Returns the authenticated user payload plus an `access` token in the standard response envelope and sets the refresh token in the secure HTTP-only cookie.
- `POST /api/auth/signup/`
  Accepts `{ "username", "email", "password", "confirm_password" }` and creates a basic user account.
  Signup users are created without staff/admin flags and without assigned role groups by default.
- `GET /api/auth/staff-invites/{staff_invite_id}/validate/?token=<invite-token>`
  Validates a public staff invite link and returns invite metadata (`email`, `role_names`, `expires_at`) for onboarding.
- `POST /api/auth/staff-invites/{staff_invite_id}/accept/`
  Accepts `{ "token", "username", "first_name?", "last_name?", "password", "confirm_password" }` and completes invite onboarding.
  On success, the system creates a real staff user account with the invite email and assigned role groups.
- `GET /api/auth/availability/username/?username=<value>`
  Returns whether the submitted username is currently available.
- `GET /api/auth/availability/email/?email=<value>`
  Returns whether the submitted email is currently available.
- `POST /api/auth/logout/`
  Requires bearer authentication and accepts a refresh token to blacklist.
- `POST /api/auth/token/refresh/`
  Returns a refreshed access token in the standard response envelope.
- `POST /api/auth/token/verify/`
  Verifies an access token and returns the standard success envelope.
- `GET /api/auth/me/`
  Returns the current authenticated user for the supplied bearer token, including `role_names` for RBAC-aware frontend routing.

## Admin

- `/admin/` uses normal Django admin session authentication.
- Admin UI is styled with Jazzmin and is separate from API JWT auth.

## Members Admin Endpoints

- `GET /api/members/`
  Lists members with optional search and basic filters.
- `POST /api/members/`
  Creates a member record.
- `GET /api/members/{member_id}/`
  Returns member detail, including attendance-summary counters and recent attendance-history rows.
- `PATCH /api/members/{member_id}/`
  Updates a member record.

## Households Admin Endpoints

- `GET /api/households/`
  Lists households with optional search and active-state filters.
- `POST /api/households/`
  Creates a household.
- `GET /api/households/{household_id}/`
  Returns household detail including member memberships.
- `PATCH /api/households/{household_id}/`
  Updates a household.
- `POST /api/households/{household_id}/members/`
  Adds a member to a household while enforcing household membership rules.
- `PATCH /api/households/{household_id}/memberships/{membership_id}/`
  Updates household membership state, relationship, dates, and head-of-household assignment.

## Groups Admin Endpoints

- `GET /api/groups/`
  Lists business groups with optional search and active-state filters.
- `POST /api/groups/`
  Creates a business group.
- `GET /api/groups/{group_id}/`
  Returns group detail including group memberships.
- `PATCH /api/groups/{group_id}/`
  Updates a business group.
- `POST /api/groups/{group_id}/members/`
  Adds a member affiliation to a business group.
- `PATCH /api/groups/{group_id}/memberships/{membership_id}/`
  Updates a group affiliation, including `role_name`, active state, and dates.

## Attendance Admin Endpoints

- `GET /api/attendance/`
  Lists service and event records with optional search, event type, date range, and active-state filters.
  Includes derived attendance progress fields:
  `attendance_progress_status`, `attendance_progress_label`, `attendance_progress_percent`,
  `attendance_is_complete`, and `attendance_last_updated_at`.
- `POST /api/attendance/`
  Creates a service or event record.
- `GET /api/attendance/{service_event_id}/`
  Returns service/event detail including the attendance summary and member attendance records.
  Includes derived completion/progress metadata and last attendance-update timestamp for correction workflows.
- `PATCH /api/attendance/{service_event_id}/`
  Updates a service or event record.
- `PUT /api/attendance/{service_event_id}/summary/`
  Creates or replaces the anonymous attendance summary for the event.
- `PATCH /api/attendance/{service_event_id}/summary/`
  Partially updates the anonymous attendance summary for the event.
- `GET /api/attendance/{service_event_id}/member-attendance/`
  Lists member attendance records for the event.
- `POST /api/attendance/{service_event_id}/member-attendance/`
  Records member attendance for the event.
- `PATCH /api/attendance/{service_event_id}/member-attendance/{member_attendance_id}/`
  Updates an existing member attendance record.

Frontend record-attendance workflow note:

- The modal-first "Record Attendance" UX in `frontend-next` currently uses the existing endpoints in sequence:
  1. `POST /api/attendance/` (create event)
  2. `PUT /api/attendance/{service_event_id}/summary/` (upsert anonymous summary)
  3. `POST /api/attendance/{service_event_id}/member-attendance/` (zero-or-more member rows)
- No dedicated orchestration endpoint is required for this product wave; partial-failure handling is surfaced in the modal with a direct "continue in event attendance" link.

## Finance Admin Endpoints

- `GET /api/finance/fund-accounts/`
  Lists fund accounts with optional search and active-state filters, including computed balances.
- `POST /api/finance/fund-accounts/`
  Creates a fund account.
- `GET /api/finance/fund-accounts/{fund_account_id}/`
  Returns fund account detail including the computed current balance.
- `PATCH /api/finance/fund-accounts/{fund_account_id}/`
  Updates a fund account.
- `GET /api/finance/transactions/`
  Lists finance transactions with optional search and filter support.
- `GET /api/finance/transactions/{transaction_id}/`
  Returns transaction detail including ledger lines.
- `PATCH /api/finance/transactions/{transaction_id}/`
  Updates safe transaction metadata only.
- `POST /api/finance/transactions/income/`
  Records a posted income transaction.
- `POST /api/finance/transactions/expense/`
  Records a posted expense transaction.
- `POST /api/finance/transactions/transfer/`
  Records a posted transfer with one `OUT` line and one `IN` line.

## Reporting Admin Endpoints

- `GET /api/reports/dashboard/`
  Returns the consolidated dashboard payload across membership, households, groups, attendance, and finance.
  Read access is intentionally limited to overarching leadership-style roles.
  Supports optional `date_preset` (`TODAY`, `THIS_WEEK`, `THIS_MONTH`, `CUSTOM`) with optional `start_date`/`end_date`.
- `GET /api/reports/members/`
  Returns member summary metrics.
- `GET /api/reports/households/`
  Returns household summary metrics.
- `GET /api/reports/groups/`
  Returns group and affiliation summary metrics, including:
  `inactive_groups`, `members_with_active_group`, `members_without_active_group`,
  `participation_rate_percent`, and `top_groups`.
- `GET /api/reports/attendance/`
  Returns attendance summary metrics, with optional `date_preset`, `start_date`, and `end_date`.
  Includes operational fields:
  `events_with_summary`, `events_without_summary`, `average_total_attendance_per_event`,
  `attendance_capture_rate_percent`, `attendance_trend`, `recent_service_events`, and `applied_range`.
- `GET /api/reports/finance/`
  Returns finance summary metrics, with optional `date_preset`, `start_date`, and `end_date`.
  Includes operational fields:
  `total_posted_transactions`, `period_breakdown`, `top_categories`, and `applied_range`.

## Settings Admin Endpoints

- `GET /api/settings/staff-users/`
  Returns the staff-user directory with role names, role ids, active-state flags, and login metadata.
- `POST /api/settings/staff-users/`
  Creates a staff user and optionally assigns one or more existing roles.
- `GET /api/settings/staff-users/{staff_user_id}/`
  Returns one staff user for settings-edit workflows.
- `PATCH /api/settings/staff-users/{staff_user_id}/`
  Updates safe staff fields (`email`, names, `is_active`) and assigned `role_ids`.
- `GET /api/settings/roles/`
  Returns a role summary with assigned-user counts and permission codes.
- `GET /api/settings/basic-users/`
  Returns basic (non-staff, non-superuser) users for elevation workflows. Defaults to unassigned-only candidates.
- `POST /api/settings/basic-users/{user_id}/elevate/`
  Elevates a basic user to staff access with explicit `role_ids` assignment.
- `GET /api/settings/staff-invites/`
  Lists staff invitation lifecycle records (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`) with role metadata and invite-link path.
- `POST /api/settings/staff-invites/`
  Creates a staff invite for a not-yet-onboarded user email and assigned role groups.
- `PATCH /api/settings/staff-invites/{staff_invite_id}/resend/`
  Resends an existing invite by rotating the secure token, refreshing expiry, and restoring `PENDING` status when valid.
- `PATCH /api/settings/staff-invites/{staff_invite_id}/revoke/`
  Revokes a pending invite link.

Role-definition caveat:

- role-definition mutation (renaming roles or changing permission maps) is intentionally not exposed through product APIs
- role definitions remain bootstrap/admin-governed through `setup_roles` and Django admin

Staff lifecycle caveat:

- public signup continues to create basic users only (no staff roles/privileges by default)
- elevation and invite/revoke actions remain admin-controlled through settings permissions
- invite resend/revoke actions remain admin-controlled through settings permissions
- invite links are tokenized for manual sharing; email delivery is intentionally out of scope in the current product slice

## Audit Admin Endpoints

- `GET /api/audit/events/`
  Returns audit events for high-value operational mutations. Supports optional filters:
  `event_type`, `actor_id`, `target_type`, `target_id`, `start_date`, `end_date`, plus optional pagination (`page`, `page_size`).
- `GET /api/audit/events/{audit_event_id}/`
  Returns one audit event payload for focused inspection.

Current first-wave coverage includes:

- member create/update
- household membership create/update
- group membership create/update
- attendance summary create/update
- member attendance create/update
- finance transaction create/update (income/expense/transfer flows included)
- staff user create/update and role-assignment changes

## Reporting Date Filters

- `date_preset` is supported on dashboard, attendance, and finance endpoints:
  - `TODAY`
  - `THIS_WEEK`
  - `THIS_MONTH`
  - `CUSTOM`
- For `CUSTOM`, both `start_date` and `end_date` are required.
- If no preset/range params are supplied, the reports use all-time behavior.
- If `end_date` is supplied for finance reporting, balances are computed as of that cutoff date.
- Member, household, group, attendance, and finance list endpoints also expose typed filter parameters in the schema for frontend consumers.
