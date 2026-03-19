# RBAC Baseline

The Haven uses Django `Group` records as business roles.

## Baseline Roles

- `Super Admin`: full access to all currently available Django permissions.
- `Church Admin`: operational administration across users, groups, membership, attendance, and finance.
- `Membership Secretary`: membership-facing create and update access.
- `Attendance Officer`: attendance-facing create and update access.
- `Finance Secretary`: finance-facing create and update access.
- `Leadership Viewer`: read-only visibility across key operational areas.

## Management Commands

- `python backend/manage.py setup_roles`
  Ensures the baseline groups exist, assigns any permissions that currently exist, and reports missing permissions for apps or models that are not ready yet.
- `python backend/manage.py seed_superuser`
  Creates the bootstrap superuser from `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, and `DJANGO_SUPERUSER_PASSWORD`.

## Notes

- `setup_roles` is idempotent and safe to re-run.
- Missing permissions are skipped instead of crashing so future domain apps can plug into the same role map incrementally.
- `seed_superuser` is idempotent and exits cleanly when the configured superuser already exists.
