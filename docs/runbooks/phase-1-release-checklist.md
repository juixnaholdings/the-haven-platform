# Phase 1 Release Checklist

## Backend Validation

- `python backend/manage.py check` passes.
- `python backend/manage.py makemigrations --check --dry-run` reports no changes.
- `pytest` passes from the repo root.
- `/api/docs/` renders the schema for core auth and admin endpoints.

## Bootstrap Readiness

- `setup_roles` is idempotent and aligned with the current model permissions.
- `seed_superuser` has documented environment variables.
- `seed_fund_accounts` is available if the finance module needs baseline accounts.

## Production Readiness

- Production secrets are stored outside the repository.
- `SECRET_KEY`, `JWT_SIGNING_KEY`, and `ALLOWED_HOSTS` are set explicitly.
- CORS and `CSRF_TRUSTED_ORIGINS` match the deployed frontend/admin origins.
- A backup has been taken before deploy.
- Migration and rollback steps are documented.

## Operational Review

- Admin registrations are usable under Jazzmin.
- Reporting access is limited to the intended Phase 1 roles.
- Empty placeholder workflows and stale placeholder files have been removed.
