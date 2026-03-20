# Phase 1 Release Checklist

## Backend Validation

- `python backend/manage.py check` passes.
- `python backend/manage.py check --deploy --settings=config.settings.production` passes with staging or production env values.
- `python backend/manage.py makemigrations --check --dry-run` reports no changes.
- `pytest` passes from the repo root.

## Staging Deployment Readiness

- `infra/compose.staging.yaml` is the approved staging stack.
- `infra/.env.staging` has been created from `infra/.env.staging.example`.
- `SECRET_KEY` and `JWT_SIGNING_KEY` are strong and not committed.
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` match the staging domain.
- PostgreSQL is not publicly exposed from the VPS.

## Deployment Workflow

- `infra/scripts/deploy_staging.sh` has been reviewed for the target server.
- `.github/workflows/deploy-staging.yml` has the required staging environment secrets.
- `infra/scripts/staging_smoke_check.sh` is ready to run after deploy.

## Smoke Verification

- `/health/` returns success.
- `/admin/login/` is reachable.
- `/api/schema` and `/api/docs/` are reachable.
- `/api/auth/login/` responds with the expected validation failure shape when called with an empty payload.

## Rollback Readiness

- A database backup has been taken before deploy.
- The previous known-good ref is documented.
- The rollback steps in `docs/runbooks/deployment.md` have been reviewed.
