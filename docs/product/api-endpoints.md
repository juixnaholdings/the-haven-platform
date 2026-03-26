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
  Returns the authenticated user payload plus `access` and `refresh` tokens in the standard response envelope.
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
  Returns member detail.
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
- `POST /api/attendance/`
  Creates a service or event record.
- `GET /api/attendance/{service_event_id}/`
  Returns service/event detail including the attendance summary and member attendance records.
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
- `GET /api/reports/members/`
  Returns member summary metrics.
- `GET /api/reports/households/`
  Returns household summary metrics.
- `GET /api/reports/groups/`
  Returns group and affiliation summary metrics.
- `GET /api/reports/attendance/`
  Returns attendance summary metrics, with optional `start_date` and `end_date`.
- `GET /api/reports/finance/`
  Returns finance summary metrics, with optional `start_date` and `end_date`.

## Settings Admin Endpoints

- `GET /api/settings/staff-users/`
  Returns a read-only staff-user directory with role names, active-state flags, and login metadata.
- `GET /api/settings/roles/`
  Returns a read-only role summary with assigned-user counts and permission codes.

## Reporting Date Filters

- `start_date` and `end_date` are optional query params on the dashboard, attendance, and finance report endpoints.
- If both are omitted, the reports use all-time behavior.
- If `end_date` is supplied for finance reporting, balances are computed as of that cutoff date.
- Member, household, group, attendance, and finance list endpoints also expose typed filter parameters in the schema for frontend consumers.
