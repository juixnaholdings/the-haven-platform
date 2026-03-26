# Frontend Implementation Map

Date: 2026-03-25

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

## Design Coverage Status

The prompt references Stitch-generated screen packs and a refined clerical-minimalism direction. No Stitch assets are currently tracked in the repo, so the screen inventory supplied in the prompt is treated as the design source of truth for implementation planning.

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

## Route Map

| Proposed route | Screen | Backend readiness | Current frontend status | Recommended wave |
| --- | --- | --- | --- | --- |
| `/login` | System login | Ready | Implemented | Wave 0 complete |
| `/dashboard` | Dashboard | Ready | Implemented | Wave 0 complete |
| `/members` | Members / Directory | Ready with caveats | Implemented | Wave 1 complete |
| `/members/new` | Create member | Ready | Implemented | Wave 1 complete |
| `/members/:memberId` | Member profile detail | Ready with caveats | Implemented | Wave 1 complete |
| `/members/:memberId/edit` | Edit member | Ready | Implemented | Wave 1 complete |
| `/households` | Household management | Ready | Implemented | Wave 1 complete |
| `/households/:householdId` | Household detail | Ready | Implemented | Wave 1 complete |
| `/groups` | Ministries / Groups | Ready with caveats | Not started | Wave 2 |
| `/groups/:groupId` | Ministry detail | Ready with caveats | Not started | Wave 2 |
| `/events` | Services / Events | Ready | Not started | Wave 2 |
| `/events/:serviceEventId` | Event detail | Ready | Not started | Wave 2 |
| `/events/:serviceEventId/attendance` | Event attendance recording | Ready | Not started | Wave 2 |
| `/finance` | Finance / Ledger | Ready with caveats | Not started | Wave 2 |
| `/finance/entries/income` | Finance entry form | Ready | Not started | Wave 2 |
| `/finance/entries/expense` | Finance entry form | Ready | Not started | Wave 2 |
| `/finance/transfers/new` | Fund transfer | Ready | Not started | Wave 2 |
| `/finance/transactions/:transactionId` | Transaction detail / audit | Ready with caveats | Not started | Wave 2 |
| `/reports` | Reports dashboard | Ready | Not started | Wave 3 |
| `/settings/roles` | Settings / Roles | Not ready | Not started | Blocked |
| `/settings/staff` | Staff user management | Not ready | Not started | Blocked |
| `/audit` | Audit trail | Not ready | Not started | Blocked |
| `/ui/states` | Functional states gallery | No backend dependency | Not started | Wave 0.5 |

## Screen-to-Endpoint Map

| Screen | Primary endpoints | Supporting endpoints | Notes |
| --- | --- | --- | --- |
| System login | `POST /api/auth/login/` | `POST /api/auth/token/refresh/`, `GET /api/auth/me/`, `POST /api/auth/logout/` | Current auth flow uses access token plus refresh cookie. |
| Dashboard | `GET /api/reports/dashboard/` | `GET /api/auth/me/` | Already wired in the frontend. |
| Members / Directory | `GET /api/members/` | `GET /api/auth/me/` | Already wired in the frontend. |
| Member profile detail | `GET /api/members/{member_id}/` | `PATCH /api/members/{member_id}/` | Detail payload is profile-only; related household/group history is not aggregated yet. |
| Create/Edit member form | `POST /api/members/`, `PATCH /api/members/{member_id}/` | `GET /api/members/{member_id}/` | Backend supports both flows now. |
| Household management | `GET /api/households/`, `POST /api/households/` | `PATCH /api/households/{household_id}/`, `POST /api/households/{household_id}/members/`, `PATCH /api/households/{household_id}/memberships/{membership_id}/` | Membership edit path is now exposed. |
| Household detail | `GET /api/households/{household_id}/` | same as above | Household detail includes member memberships. |
| Ministries / Groups | `GET /api/groups/`, `POST /api/groups/` | `PATCH /api/groups/{group_id}/` | Backend concept is flat groups, not hierarchical ministries. |
| Ministry detail | `GET /api/groups/{group_id}/` | `POST /api/groups/{group_id}/members/`, `PATCH /api/groups/{group_id}/memberships/{membership_id}/` | Membership role and active-state editing is supported. |
| Services / Events | `GET /api/attendance/`, `POST /api/attendance/` | `PATCH /api/attendance/{service_event_id}/` | Event list/detail/update flows are ready. |
| Event attendance recording | `GET /api/attendance/{service_event_id}/`, `GET /api/attendance/{service_event_id}/member-attendance/` | `PUT|PATCH /api/attendance/{service_event_id}/summary/`, `POST /api/attendance/{service_event_id}/member-attendance/`, `PATCH /api/attendance/{service_event_id}/member-attendance/{member_attendance_id}/` | Supports both anonymous summary and member attendance. |
| Finance / Ledger | `GET /api/finance/fund-accounts/`, `GET /api/finance/transactions/` | `GET /api/reports/finance/` | Ledger lists are ready, but unpaginated. |
| Finance entry form | `POST /api/finance/transactions/income/`, `POST /api/finance/transactions/expense/` | `GET /api/finance/fund-accounts/`, `GET /api/attendance/` | Service/event association is optional. |
| Fund transfer | `POST /api/finance/transactions/transfer/` | `GET /api/finance/fund-accounts/` | Validates source/destination separation server-side. |
| Transaction detail / audit | `GET /api/finance/transactions/{transaction_id}/`, `PATCH /api/finance/transactions/{transaction_id}/` | none | Record detail exists, but no dedicated audit timeline endpoint exists. |
| Reports dashboard | `GET /api/reports/members/`, `GET /api/reports/households/`, `GET /api/reports/groups/`, `GET /api/reports/attendance/`, `GET /api/reports/finance/` | `GET /api/reports/dashboard/` | Reports are backend-ready. |
| Settings / Roles | none | existing role commands/admin only | Requires backend API work. |
| Staff user management | none | `GET /api/auth/me/` only | Requires backend API work. |
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

### Shared primitives extracted during Wave 1

| Primitive | Why it exists | Current screens |
| --- | --- | --- |
| `PageHeader` | Standardizes eyebrow, title, helper copy, badges, and actions | dashboard, members, member form/detail, households, household detail |
| `StatusBadge` | Normalizes active/inactive and contextual state rendering | dashboard, members, households |
| `EntityTable` | Provides the reusable searchable-table pattern for operational pages | members, households, household memberships |
| `DetailPanel` | Provides a reusable read-only profile layout | member detail |
| `FormSection` | Groups create/edit fields into reusable panel sections | member create/edit, household create/update, membership management |
| `EmptyState` | Covers empty and no-results states without fake data | members, households, household detail |
| `ErrorState` | Handles page-level failures consistently | dashboard, members, member detail/form, households, household detail |
| `LoadingState` | Handles page-level loading consistently | dashboard, members, member detail/form, households, household detail |

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

### Wave 3: reporting expansion and polish

- Reports dashboard
- Deeper reporting breakdowns and date-filter UX
- Functional states gallery for consistent empty/loading/error coverage

### Blocked wave: settings and audit

- Settings / Roles
- Staff user management
- Audit trail

Blocked by:

- missing backend user/role management APIs
- missing audit-log query surface

## Immediate Build Recommendation

The next coding wave should be:

1. implement groups / ministries list and detail using the new shared data-page primitives
2. implement services / events list/detail plus attendance recording flows
3. implement finance ledger list, entry, transfer, and transaction detail flows
4. add a routed reports surface that reuses the current dashboard/reporting patterns

Backend blockers that still remain outside those waves:

- settings / roles / staff-user product APIs are still missing
- audit trail remains blocked on missing backend query surfaces
