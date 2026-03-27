# Frontend Implementation Map

Date: 2026-03-26

This map ties the current frontend architecture to the real backend readiness state and the Stitch screen inventory supplied for The Haven.

## Current Frontend Architecture

The existing repo direction should be preserved:

- React + Vite + TypeScript
- `frontend/src/api/` for the shared backend client
- `frontend/src/auth/` for session/bootstrap/protected-route handling
- `frontend/src/domains/` for per-domain API wrappers
- `frontend/src/app/` for routing and shell composition
- `frontend/src/pages/` for route-level screens

Current implemented routes:

- `/login`
- `/dashboard`
- `/members`
- `/members/new`
- `/members/:memberId`
- `/members/:memberId/edit`
- `/households`
- `/households/:householdId`
- `/groups`
- `/groups/:groupId`
- `/events`
- `/events/:serviceEventId`
- `/events/:serviceEventId/attendance`
- `/attendance`
- `/finance`
- `/finance/entries/income`
- `/finance/entries/expense`
- `/finance/transfers/new`
- `/finance/transactions/:transactionId`
- `/reports`
- `/settings/roles`
- `/settings/staff`

## Design Coverage Status

The Stitch design bundle is now tracked in-repo under `docs/design/stitch/`. That bundle is the visual source of truth for frontend refinement, with the refined clerical-minimalism variants preferred whenever multiple directions exist.

Design source of truth for this map:

- Dashboard
- Attendance overview
- Members / Directory
- Finance / Ledger
- Reports dashboard
- Member profile detail
- Create/Edit member form
- Household management
- Household detail
- Ministries / Groups
- Ministry detail
- Services / Events
- Event attendance recording
- Finance entry form
- Fund transfer
- Transaction detail / audit
- Settings / Roles
- Staff user management
- System login
- Functional states gallery

Current alignment status:

- the authenticated shell, login page, dashboard, members, households, groups, events, and attendance screens have now received a Stitch-aligned polish pass
- shared UI primitives have been visually unified around the same spacing, card, badge, table, and state language
- finance, reports, and settings now also follow the same Stitch-aligned visual system and route composition
- settings staff management now supports backend-backed create/update and role assignment flows
- role-definition edits remain intentionally blocked because role definitions are seed-governed
- members detail now consumes the richer backend payload (household context, group affiliations, attendance summary), and key list screens now consume optional pagination with a shared UI control pattern

## Route Map

| Proposed route | Screen | Backend readiness | Current frontend status | Recommended wave |
| --- | --- | --- | --- | --- |
| `/login` | System login | Ready | Implemented | Wave 0 complete |
| `/dashboard` | Dashboard | Ready | Implemented | Wave 0 complete |
| `/members` | Members / Directory | Ready | Implemented | Wave 1 complete |
| `/members/new` | Create member | Ready | Implemented | Wave 1 complete |
| `/members/:memberId` | Member profile detail | Ready | Implemented | Wave 1 complete |
| `/members/:memberId/edit` | Edit member | Ready | Implemented | Wave 1 complete |
| `/households` | Household management | Ready | Implemented | Wave 1 complete |
| `/households/:householdId` | Household detail | Ready | Implemented | Wave 1 complete |
| `/groups` | Ministries / Groups | Ready with caveats | Implemented | Wave 2 complete |
| `/groups/:groupId` | Ministry detail | Ready with caveats | Implemented | Wave 2 complete |
| `/events` | Services / Events | Ready | Implemented | Wave 2 complete |
| `/events/:serviceEventId` | Event detail | Ready | Implemented | Wave 2 complete |
| `/events/:serviceEventId/attendance` | Event attendance recording | Ready | Implemented | Wave 2 complete |
| `/attendance` | Attendance overview | Ready | Implemented | Wave 2 complete |
| `/finance` | Finance / Ledger | Ready with caveats | Implemented | Wave 3 complete |
| `/finance/entries/income` | Finance entry form | Ready | Implemented | Wave 3 complete |
| `/finance/entries/expense` | Finance entry form | Ready | Implemented | Wave 3 complete |
| `/finance/transfers/new` | Fund transfer | Ready | Implemented | Wave 3 complete |
| `/finance/transactions/:transactionId` | Transaction detail / audit | Ready with caveats | Implemented | Wave 3 complete |
| `/reports` | Reports dashboard | Ready | Implemented | Wave 3 complete |
| `/settings/roles` | Settings / Roles | Ready with caveats | Implemented (role definitions read-only) | Wave 4 complete |
| `/settings/staff` | Staff user management | Ready with caveats | Implemented (create/update + role assignment) | Wave 4 complete |
| `/audit` | Audit trail | Not ready | Not started | Blocked |
| `/ui/states` | Functional states gallery | No backend dependency | Not started | Wave 0.5 |

## Screen-to-Endpoint Map

| Screen | Primary endpoints | Supporting endpoints | Notes |
| --- | --- | --- | --- |
| System login | `POST /api/auth/login/` | `POST /api/auth/token/refresh/`, `GET /api/auth/me/`, `POST /api/auth/logout/` | Current auth flow uses access token plus refresh cookie. |
| Dashboard | `GET /api/reports/dashboard/` | `GET /api/auth/me/` | Already wired in the frontend. |
| Members / Directory | `GET /api/members/` | `GET /api/auth/me/` | Implemented with optional pagination (`page`, `page_size`) and normalized list filtering UI. |
| Member profile detail | `GET /api/members/{member_id}/` | `PATCH /api/members/{member_id}/` | Implemented with household context, group affiliations, and attendance summary sections from the richer payload. |
| Create/Edit member form | `POST /api/members/`, `PATCH /api/members/{member_id}/` | `GET /api/members/{member_id}/` | Backend supports both flows now. |
| Household management | `GET /api/households/`, `POST /api/households/` | `PATCH /api/households/{household_id}/`, `POST /api/households/{household_id}/members/`, `PATCH /api/households/{household_id}/memberships/{membership_id}/` | Membership edit path is now exposed; list view now uses optional pagination. |
| Household detail | `GET /api/households/{household_id}/` | same as above | Household detail includes member memberships. |
| Ministries / Groups | `GET /api/groups/`, `POST /api/groups/` | `PATCH /api/groups/{group_id}/` | Backend concept is flat groups, not hierarchical ministries; list view now uses optional pagination. |
| Ministry detail | `GET /api/groups/{group_id}/` | `POST /api/groups/{group_id}/members/`, `PATCH /api/groups/{group_id}/memberships/{membership_id}/` | Membership role and active-state editing is supported. |
| Services / Events | `GET /api/attendance/`, `POST /api/attendance/` | `PATCH /api/attendance/{service_event_id}/` | Event list/detail/update flows are ready; list view now uses optional pagination. |
| Attendance overview | `GET /api/reports/attendance/` | `GET /api/attendance/` | Uses reporting metrics plus event records; summary attendance and member attendance stay separate. |
| Event attendance recording | `GET /api/attendance/{service_event_id}/`, `GET /api/attendance/{service_event_id}/member-attendance/` | `PUT|PATCH /api/attendance/{service_event_id}/summary/`, `POST /api/attendance/{service_event_id}/member-attendance/`, `PATCH /api/attendance/{service_event_id}/member-attendance/{member_attendance_id}/` | Supports both anonymous summary and member attendance. |
| Finance / Ledger | `GET /api/finance/fund-accounts/`, `GET /api/finance/transactions/` | `GET /api/reports/finance/` | Ledger lists are ready and now support optional pagination via `page`/`page_size`. |
| Finance entry form | `POST /api/finance/transactions/income/`, `POST /api/finance/transactions/expense/` | `GET /api/finance/fund-accounts/`, `GET /api/attendance/` | Service/event association is optional. |
| Fund transfer | `POST /api/finance/transactions/transfer/` | `GET /api/finance/fund-accounts/` | Validates source/destination separation server-side. |
| Transaction detail / audit | `GET /api/finance/transactions/{transaction_id}/`, `PATCH /api/finance/transactions/{transaction_id}/` | none | Record detail exists, but no dedicated audit timeline endpoint exists. |
| Reports dashboard | `GET /api/reports/members/`, `GET /api/reports/households/`, `GET /api/reports/groups/`, `GET /api/reports/attendance/`, `GET /api/reports/finance/` | `GET /api/reports/dashboard/` | Reports are backend-ready. |
| Settings / Roles | `GET /api/settings/roles/` | `GET /api/settings/staff-users/` | API-backed role and permission summary; role-definition mutation remains blocked by design. |
| Staff user management | `GET /api/settings/staff-users/`, `POST /api/settings/staff-users/`, `GET /api/settings/staff-users/{staff_user_id}/`, `PATCH /api/settings/staff-users/{staff_user_id}/` | `GET /api/settings/roles/` | API-backed staff-user management now supports create/update and role assignment. Invite lifecycle remains out of scope. |
| Audit trail | none | model audit fields only | Requires backend API work. |

## Shared Component Map

### Existing shared frontend building blocks

| Component / module | Repo status | Use now |
| --- | --- | --- |
| `frontend/src/api/client.ts` | Implemented | All backend requests |
| `frontend/src/auth/AuthContext.tsx` | Implemented | Session bootstrap and auth state |
| `frontend/src/auth/ProtectedRoute.tsx` | Implemented | Protected routing |
| `frontend/src/app/AppShell.tsx` | Implemented | Authenticated shell/navigation |
| `frontend/src/components/ErrorAlert.tsx` | Implemented | Validation/network/server errors |
| `frontend/src/components/LoadingScreen.tsx` | Implemented | Loading/bootstrapping states |
| `frontend/src/components/PageHeader.tsx` | Implemented | Data-page titles, meta badges, actions |
| `frontend/src/components/StatusBadge.tsx` | Implemented | Active/inactive and state labels |
| `frontend/src/components/EmptyState.tsx` | Implemented | Empty and no-results states |
| `frontend/src/components/ErrorState.tsx` | Implemented | Page-level error states |
| `frontend/src/components/LoadingState.tsx` | Implemented | Page-level loading states |
| `frontend/src/components/EntityTable.tsx` | Implemented | Directory and management tables |
| `frontend/src/components/DetailPanel.tsx` | Implemented | Read-only entity detail sections |
| `frontend/src/components/FormSection.tsx` | Implemented | Grouped create/edit forms |
| `frontend/src/components/StatCard.tsx` | Implemented | Summary metric cards across dashboards and attendance |

### Shared primitives extracted during Wave 1

| Primitive | Why it exists | Current screens |
| --- | --- | --- |
| `PageHeader` | Standardizes eyebrow, title, helper copy, badges, and actions | dashboard, members, households, ministries, events, attendance |
| `StatusBadge` | Normalizes active/inactive and contextual state rendering | dashboard, members, households, ministries, events, attendance |
| `EntityTable` | Provides the reusable searchable-table pattern for operational pages | members, households, household memberships, ministries, events, attendance records |
| `DetailPanel` | Provides a reusable read-only profile layout | member detail and any future detail-heavy pages that need a simpler panel pattern |
| `FormSection` | Groups create/edit fields into reusable panel sections | member, household, ministry, event, and attendance workflows |
| `EmptyState` | Covers empty and no-results states without fake data | members, households, ministries, events, attendance |
| `ErrorState` | Handles page-level failures consistently | dashboard and all implemented operational pages |
| `LoadingState` | Handles page-level loading consistently | dashboard and all implemented operational pages |
| `StatCard` | Reuses metric-card presentation for overview and detail summaries | dashboard, event detail, attendance overview, attendance recording |

### Stitch alignment refinement wave

- the shell now uses the calmer sidebar-and-stage composition from the Stitch clerical-minimalism direction
- login, dashboard, members, households, groups, events, and attendance share one warmed visual system instead of route-by-route styling
- empty, loading, and error states are now visually consistent with the functional states gallery

## Implementation Waves

### Wave 1: finish the core people operations flow

- Members directory polish
- Member create/edit screens
- Member detail screen scoped to current backend payload
- Household list/detail/manage screens

Why first:

- The frontend already has auth, shell, dashboard, and member list foundations.
- People/household flows are the shortest path to broad product coverage.
- Household management is now feasible with the membership update endpoint added in this audit pass.

Status:

- Completed in this implementation wave.
- The shared data-page primitives extracted here should now be reused instead of re-creating page-specific list/detail/form patterns.

### Wave 2: complete group, event, attendance, and finance operations

- Groups / Ministries list and detail
- Services / Events list and detail
- Event attendance recording
- Finance ledger, income/expense entry, fund transfer, transaction detail

Why second:

- These screens are backend-ready and map well onto the existing domain API modules.
- The shared table/detail/form/state primitives are now in place, so these screens can be implemented with less UI duplication.

Status:

- Groups / ministries list and detail are now implemented.
- Services / events list and detail are now implemented.
- Attendance overview and event attendance recording are now implemented.
- Finance remains the major unfinished Wave 2 domain.

### Wave 3: finance, reporting, and settings foundation

- Finance ledger, entry, transfer, and transaction detail
- Reports dashboard
- Settings roles and staff-user foundations

Status:

- Completed in this implementation wave.
- Settings now includes staff create/update and role assignment flows while keeping role-definition edits blocked.

### Blocked wave: deeper settings governance and audit

- Role-definition editing and permission-map mutation flows
- Invite/reset-password lifecycle workflows
- Audit trail

Blocked by:

- role definitions are currently seed-governed through bootstrap/admin
- missing audit-log query surface

## Immediate Build Recommendation

The next coding wave should be:

1. implement any remaining audit-trail backend and frontend surfaces
2. decide whether role-definition mutation is needed beyond seeded RBAC governance
3. adopt the new optional paginated list contracts (`page`, `page_size`) in data-heavy frontend screens as record volumes grow

Backend blockers that still remain outside those waves:

- role-definition mutation APIs are intentionally missing
- audit trail remains blocked on missing backend query surfaces
