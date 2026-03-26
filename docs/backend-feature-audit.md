# Backend Feature Audit

Date: 2026-03-25

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
| Members | Ready with caveats | `apps/members/apis/admin.py`, `apps/members/serializers.py` | List/detail/create/update exist, but detail is profile-only and not relationship-rich. |
| Households | Ready | `apps/households/apis/admin.py`, `apps/households/services.py` | List/detail/create/update/add-member and membership update are available for a real management screen. |
| Groups / Ministries | Ready with caveats | `apps/groups/apis/admin.py`, `apps/groups/models.py` | Group/ministry list/detail/membership editing exist, but only flat groups are supported. |
| Events / Services | Ready | `apps/attendance/apis/admin.py`, `apps/attendance/serializers.py` | Service/event CRUD, attendance summary, and member attendance flows are present. |
| Attendance overview | Ready | `apps/reporting/apis/admin.py`, `apps/attendance/apis/admin.py` | Overview/report and per-event recording screens can use real data. |
| Finance / Ledger | Ready with caveats | `apps/finance/apis/admin.py`, `apps/finance/services.py` | Core ledger flows work, but there is no reversal/void workflow or dedicated audit trail. |
| Reports | Ready | `apps/reporting/apis/admin.py`, `apps/reporting/selectors.py` | Reporting screens can use real summary endpoints now. |
| Settings / Roles / Users | Not ready | `apps/users/urls.py`, `apps/users/management/commands/` | Auth exists, but there are no user-management or role-management APIs for UI screens. |
| Audit Trail | Not ready | `apps/common/models.py`, no audit-log app/API | Models capture audit fields, but there is no audit timeline/query surface. |

## Cross-Cutting Findings

- API responses are consistently wrapped in the standard success/error envelope via `apps.common.responses`.
- Auth uses JWT access tokens plus a secure refresh-cookie flow. The frontend should not store refresh tokens in browser storage.
- `GET /api/auth/me/` now includes `role_names`, which enables role-aware navigation and screen gating without probing endpoints blindly.
- Core list endpoints are currently unpaginated arrays. This is workable for Phase 1 but should be treated as a performance caveat for large records.
- Choice metadata is available through the schema, but there is no dedicated enum/metadata endpoint for frontend forms.
- Most domains rely on `is_active` and update flows instead of destructive delete endpoints.
- `AuditModel` provides `created_at`, `updated_at`, `created_by`, and `updated_by`, but there is no dedicated audit trail model or query API.

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

Status: `Ready with caveats`

What exists:

- `GET /api/members/`
- `POST /api/members/`
- `GET /api/members/{member_id}/`
- `PATCH /api/members/{member_id}/`

Caveats:

- Member detail is limited to core member fields. It does not include household memberships, group affiliations, attendance history, or finance references.
- No delete/archive endpoint beyond `is_active`.
- No pagination on the member directory list.

Frontend consequence:

- Directory, create member, and edit member screens are feasible now.
- A richer member profile screen should either scope itself to the current payload or wait for a cross-domain member detail aggregation endpoint.

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

### Finance / Ledger

Status: `Ready with caveats`

What exists:

- Fund account list/detail/create/update
- Transaction list/detail/update
- Income, expense, and transfer create endpoints
- Finance reporting summary endpoint

Caveats:

- Transactions are posted-ledger records. There is no reversal, void, or deletion workflow.
- Transaction “audit” is limited to the transaction detail payload and model audit fields; there is no separate audit timeline.
- No pagination on transaction list endpoints.

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

Status: `Not ready`

What exists:

- Login/logout/current-user auth endpoints
- RBAC constants and role seeding command
- Superuser seeding command
- Django admin for manual ops

What is missing for product UI:

- Staff user list/detail/create/update API
- Role list/detail/update API
- User-role assignment API
- Settings metadata/config API

Frontend consequence:

- The current Settings / Roles / Staff User screens should not be scheduled as normal product implementation yet.
- Those screens require a dedicated backend slice rather than frontend-only work.

### Audit Trail

Status: `Not ready`

What exists:

- Audit fields on core models through `AuditModel`

What is missing:

- Audit log model
- Audit event query endpoints
- Timeline/filter/export surfaces

Frontend consequence:

- Transaction detail can show current record metadata only.
- A true audit trail screen is blocked on backend implementation.

## Low-Risk Readiness Fixes Applied During This Audit

- Added `role_names` to the auth user payload returned by login and `GET /api/auth/me/`.
- Fixed `config.settings.test` so local `backend/.env` security redirects do not leak into pytest runs.
- Exposed `PATCH /api/households/{household_id}/memberships/{membership_id}/` to support real household management instead of add-only membership flows.

## Recommended Product Build Order

1. Finish the core operations screens that already have backend coverage:
   login polish, dashboard, members, households, groups, services/events, attendance recording, finance, reports.
2. Add richer cross-domain read models where the current screens need more than the core CRUD payloads:
   especially member profile aggregation.
3. Build a dedicated settings/users/roles backend slice.
4. Build a dedicated audit trail slice.
