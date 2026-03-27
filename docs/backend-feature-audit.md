# Backend Feature Audit

Date: 2026-03-26

This audit is based on the actual repository state on `develop`. It reflects inspected backend apps, URL wiring, serializers, selectors, services, permissions, tests, and the current frontend integration layer. It is the working product-readiness source of truth for frontend implementation planning.

## Audit Basis

Inspected areas included:

- `backend/config/urls.py`
- `backend/apps/*/{models.py,serializers.py,selectors.py,services.py,permissions.py,urls.py,apis/admin.py,apis/public.py}`
- current backend tests under `backend/apps/*/tests/`
- current frontend routes and domain API modules under `frontend/src/`

## Status Legend

- `Ready`: backend surface is sufficient for the named product area without additional API work.
- `Ready with caveats`: backend surface is usable, but the frontend should account for meaningful limitations.
- `Not ready`: the product area lacks the API surface needed for a real screen flow.

## Executive Summary

| Product area | Status | Repo evidence | Frontend implication |
| --- | --- | --- | --- |
| Auth / Login / Session bootstrap | Ready | `apps/users/apis/public.py`, `apps/users/serializers.py`, `frontend/src/auth/` | Login, session restore, protected routes, and logout can use real backend flows now. |
| Dashboard | Ready | `apps/reporting/apis/admin.py`, `apps/reporting/selectors.py` | Dashboard cards can use real backend aggregates now. |
| Members | Ready | `apps/members/apis/admin.py`, `apps/members/serializers.py`, `apps/members/selectors.py` | List/detail/create/update exist, and detail now includes household, group, and attendance context. |
| Households | Ready | `apps/households/apis/admin.py`, `apps/households/services.py` | List/detail/create/update/add-member and membership update are available for a real management screen. |
| Groups / Ministries | Ready with caveats | `apps/groups/apis/admin.py`, `apps/groups/models.py` | Group/ministry list/detail/membership editing exist, but only flat groups are supported. |
| Events / Services | Ready | `apps/attendance/apis/admin.py`, `apps/attendance/serializers.py` | Service/event CRUD, attendance summary, and member attendance flows are present. |
| Attendance overview | Ready | `apps/reporting/apis/admin.py`, `apps/attendance/apis/admin.py` | Overview/report and per-event recording screens can use real data. |
| Finance / Ledger | Ready with caveats | `apps/finance/apis/admin.py`, `apps/finance/services.py`, `apps/common/models.py` | Core ledger flows work; audit events now track transaction mutations, but reversal/void workflows remain out of scope. |
| Reports | Ready | `apps/reporting/apis/admin.py`, `apps/reporting/selectors.py` | Reporting screens can use real summary endpoints now. |
| Settings / Roles / Users | Ready with caveats | `apps/users/apis/admin.py`, `apps/users/services.py`, `apps/users/urls.py` | Staff-user create/update and role assignment are API-backed; role-definition mutation remains bootstrap/admin-only. |
| Audit Trail | Ready with caveats | `apps/common/models.py`, `apps/common/apis/admin.py`, `apps/common/services.py` | Admin-only audit list/detail and filters are now available for high-value mutations, with limited first-wave coverage scope. |

## Cross-Cutting Findings

- API responses are consistently wrapped in the standard success/error envelope via `apps.common.responses`.
- Auth uses JWT access tokens plus a secure refresh-cookie flow. The frontend should not store refresh tokens in browser storage.
- `GET /api/auth/me/` now includes `role_names`, which enables role-aware navigation and screen gating without probing endpoints blindly.
- Core list endpoints now support optional pagination using `page` and `page_size` query params while preserving unpaginated compatibility for existing consumers.
- Choice metadata is available through the schema, but there is no dedicated enum/metadata endpoint for frontend forms.
- Most domains rely on `is_active` and update flows instead of destructive delete endpoints.
- A dedicated `AuditEvent` model and admin-only read API now provide first-wave mutation traceability.

## Module Audit

### Auth / Session

Status: `Ready`

What exists:

- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/token/verify/`
- `GET /api/auth/me/`

Notes:

- Refresh is cookie-based, which aligns with the current frontend auth client.
- `UserMeSerializer` now exposes `role_names` for frontend RBAC-aware rendering.
- Auth is sufficient for login, protected shell bootstrapping, and session restore.

### Dashboard

Status: `Ready`

What exists:

- `GET /api/reports/dashboard/`

Notes:

- The dashboard endpoint returns membership, household, group, attendance, and finance summaries in one payload.
- It is suitable for the current dashboard card layout and future richer composition.

### Members

Status: `Ready`

What exists:

- `GET /api/members/`
- `POST /api/members/`
- `GET /api/members/{member_id}/`
- `PATCH /api/members/{member_id}/`

Notes:

- Member detail now includes active/current household context, household membership history, group memberships, and attendance summary counters.
- Finance or giving summary is still not included because there is no direct member-linked finance model in the current ledger design.
- Member list now supports optional pagination (`page`, `page_size`) in addition to existing filters.
- No delete/archive endpoint beyond `is_active`.

Frontend consequence:

- Directory, create member, edit member, and richer profile detail screens are feasible now without a separate cross-domain aggregation endpoint.

### Households

Status: `Ready`

What exists:

- `GET /api/households/`
- `POST /api/households/`
- `GET /api/households/{household_id}/`
- `PATCH /api/households/{household_id}/`
- `POST /api/households/{household_id}/members/`
- `PATCH /api/households/{household_id}/memberships/{membership_id}/`

Notes:

- Household detail includes member memberships.
- Domain rules already existed in services for head-of-household enforcement and conflicting active memberships.
- This audit pass exposed those membership edit rules through the API, which removes a direct blocker for the household-management screen.
- Household list supports optional pagination (`page`, `page_size`).

### Groups / Ministries

Status: `Ready with caveats`

What exists:

- `GET /api/groups/`
- `POST /api/groups/`
- `GET /api/groups/{group_id}/`
- `PATCH /api/groups/{group_id}/`
- `POST /api/groups/{group_id}/members/`
- `PATCH /api/groups/{group_id}/memberships/{membership_id}/`

Caveats:

- The backend supports flat business groups, not a richer ministry hierarchy or parent/child structure.
- If product copy uses “ministries”, the frontend should treat groups as the current ministry analogue.

Frontend consequence:

- Ministry/group list and detail screens are feasible now.
- Hierarchical ministry management is out of scope for the current backend.
- Group list supports optional pagination (`page`, `page_size`).

### Events / Services and Attendance

Status: `Ready`

What exists:

- `GET /api/attendance/`
- `POST /api/attendance/`
- `GET /api/attendance/{service_event_id}/`
- `PATCH /api/attendance/{service_event_id}/`
- `PUT|PATCH /api/attendance/{service_event_id}/summary/`
- `GET|POST /api/attendance/{service_event_id}/member-attendance/`
- `PATCH /api/attendance/{service_event_id}/member-attendance/{member_attendance_id}/`
- `GET /api/reports/attendance/`

Notes:

- Event/service CRUD, anonymous summary attendance, and member-level attendance are all available.
- The backend correctly keeps summary attendance and member attendance separate; the frontend should not assume reconciliation.
- Service event and event member-attendance lists support optional pagination (`page`, `page_size`).

### Finance / Ledger

Status: `Ready with caveats`

What exists:

- Fund account list/detail/create/update
- Transaction list/detail/update
- Income, expense, and transfer create endpoints
- Finance reporting summary endpoint

Caveats:

- Transactions are posted-ledger records. There is no reversal, void, or deletion workflow.
- Audit events now track transaction create/update actions, but the audit layer is still list-first and not a full forensic subsystem.
- Transaction and fund-account lists support optional pagination (`page`, `page_size`).

Frontend consequence:

- Ledger list, entry forms, transfer flow, transaction detail, and finance dashboard/report screens are feasible now.
- A true audit-history screen is not feasible without additional backend work.

### Reports

Status: `Ready`

What exists:

- `GET /api/reports/dashboard/`
- `GET /api/reports/members/`
- `GET /api/reports/households/`
- `GET /api/reports/groups/`
- `GET /api/reports/attendance/`
- `GET /api/reports/finance/`

Notes:

- Optional date filters are already implemented where relevant.
- The backend is strong enough for a reports dashboard and summary cards/tables.
- Export, BI, and chart-specific endpoints are intentionally out of scope.

### Settings / Roles / Users

Status: `Ready with caveats`

What exists:

- Login/logout/current-user auth endpoints
- RBAC constants and role seeding command
- Superuser seeding command
- Django admin for manual ops
- `GET /api/settings/staff-users/`
- `POST /api/settings/staff-users/`
- `GET /api/settings/staff-users/{staff_user_id}/`
- `PATCH /api/settings/staff-users/{staff_user_id}/`
- `GET /api/settings/roles/`

Caveats:

- Staff-user mutations are intentionally scoped to controlled create/update flows and role assignment.
- Role definitions and permission maps remain bootstrap-governed and are still not mutable through product APIs.
- Settings events are now visible through the audit list API, but there is no dedicated settings-specific timeline endpoint.

Frontend consequence:

- Staff-user management screens can now support create/update and role assignment workflows.
- Role definition editing should remain blocked in product UI.

### Audit Trail

Status: `Ready with caveats`

What exists:

- `AuditEvent` model in `apps.common`
- `GET /api/audit/events/` with filters:
  `event_type`, `actor_id`, `target_type`, `target_id`, `start_date`, `end_date`
- `GET /api/audit/events/{audit_event_id}/`
- Audit hooks for high-value write operations:
  member create/update, household membership changes, group membership changes,
  attendance summary create/update, member attendance create/update,
  finance transaction create/update, staff user create/update, and role-assignment changes

What is missing:

- Export and long-form forensic workflows
- Cross-request correlation/tracing metadata
- Broader coverage beyond first-wave high-value mutations

Frontend consequence:

- `/audit` can now render a real admin activity feed from backend audit APIs.
- Advanced audit analytics/export remain out of scope.

## Low-Risk Readiness Fixes Applied During This Audit

- Added `role_names` to the auth user payload returned by login and `GET /api/auth/me/`.
- Fixed `config.settings.test` so local `backend/.env` security redirects do not leak into pytest runs.
- Exposed `PATCH /api/households/{household_id}/memberships/{membership_id}/` to support real household management instead of add-only membership flows.
- Added optional pagination support across high-value list endpoints: members, households, groups, service events, event member-attendance, and finance transactions/fund accounts.
- Enriched member detail payload with household context, group memberships, and attendance summary counters.
- Added settings mutation endpoints for staff-user create/update plus role assignment while keeping role-definition edits read-only.
- Added a first-wave audit trail model, read APIs, and service-layer logging hooks for high-value mutations.

## Recommended Product Build Order

1. Finish the core operations screens that already have backend coverage:
   login polish, dashboard, members, households, groups, services/events, attendance recording, finance, reports.
2. Add richer cross-domain read models where the current screens need more than the core CRUD payloads:
   especially member profile aggregation.
3. Expand audit coverage and add targeted export/forensics features only if product scope requires them.
4. Consider optional invite/reset-password workflows if product scope requires them.
