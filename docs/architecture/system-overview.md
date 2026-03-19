# System Overview

The Haven backend is a Django modular monolith inside the monorepo.

## Current Domain Foundation

- `users`: authentication, admin bootstrap, JWT API auth, and baseline RBAC roles.
- `members`: core member records for people in the church domain.
- `households`: household records plus the membership relationship between a member and a household.

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
