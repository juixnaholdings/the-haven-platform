# System Overview

The Haven backend is a Django modular monolith inside the monorepo.

## Current Domain Foundation

- `users`: authentication, admin bootstrap, JWT API auth, and baseline RBAC roles.
- `members`: core member records for people in the church domain.
- `households`: household records plus the membership relationship between a member and a household.
- `groups`: business groups and the affiliation relationship between a member and a group.
- `attendance`: service/event records, anonymous attendance summaries, and member-level attendance records.
- `finance`: fund accounts plus posted ledger transactions and transaction lines.
- `reporting`: selector-driven dashboard and summary reporting over the existing domain models.

## Groups Rules

- Business groups in the `groups` app are distinct from Django auth groups used for RBAC roles.
- A member can have only one active affiliation with the same business group at a time.
- Ended affiliations remain in history instead of being overwritten.
- Group detail responses include memberships through the `GroupMembership` relationship model.
- `GroupMembership.role_name` captures the member's role inside that business group when relevant.

## Household Rules

- A member can have only one active household membership at a time.
- A household can have only one active head at a time.
- Household detail responses include household members through the `HouseholdMembership` relationship model.

## Attendance Rules

- `ServiceEvent` is the root record for services and other church events.
- `AttendanceSummary` is the anonymous aggregate attendance record for an event and is distinct from member-level attendance.
- Each event can have only one attendance summary.
- `MemberAttendance` records are per member per event, with one attendance record allowed for the same member and event pair.
- Summary totals are validated independently from member attendance records; they do not have to match the number of known member attendance rows.

## Finance Rules

- `FundAccount` represents an internal church fund bucket, not a bank account.
- `Transaction` is the posted finance event header and can optionally link to a `ServiceEvent`.
- `TransactionLine` is the ledger source of truth for balances.
- Income creates one `IN` line, expense creates one `OUT` line, and transfer creates one `OUT` plus one `IN` line under the same transaction.
- Fund balances are computed from posted transaction lines; no manual balance field is the source of truth.

## Reporting Rules

- Reporting is query-only at MVP and does not introduce reporting tables.
- Dashboard and report endpoints aggregate directly from members, households, groups, attendance, and finance source-of-truth records.
- Optional `start_date` and `end_date` filters apply to attendance, finance, and dashboard summaries.
- Finance balances are computed from posted ledger lines, using `end_date` as the balance cutoff when a range is supplied.

## API Shape

- API routes live under the configured API prefix.
- Admin/staff domain endpoints use `APIView` classes under `app/apis/admin.py`.
- Reads live in `selectors.py`.
- Writes and domain rules live in `services.py`.
- Responses use the project-wide response envelope and exception handler.

## Release-Readiness Notes

- The API schema is exposed at `/api/schema` and `/api/docs/`.
- Reporting access is intentionally scoped by role and domain instead of allowing any single unrelated model permission to unlock all reports.
- Bootstrap commands cover roles, superuser creation, and optional baseline fund accounts.
- Production settings expect explicit `SECRET_KEY`, `ALLOWED_HOSTS`, JWT signing, and secure cookie/TLS configuration.
