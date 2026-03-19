# System Overview

The Haven backend is a Django modular monolith inside the monorepo.

## Current Domain Foundation

- `users`: authentication, admin bootstrap, JWT API auth, and baseline RBAC roles.
- `members`: core member records for people in the church domain.
- `households`: household records plus the membership relationship between a member and a household.
- `groups`: business groups and the affiliation relationship between a member and a group.

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

## API Shape

- API routes live under the configured API prefix.
- Admin/staff domain endpoints use `APIView` classes under `app/apis/admin.py`.
- Reads live in `selectors.py`.
- Writes and domain rules live in `services.py`.
- Responses use the project-wide response envelope and exception handler.
