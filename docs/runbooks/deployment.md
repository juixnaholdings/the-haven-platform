# Deployment Runbook

This runbook covers the backend deployment order for the Phase 1 release.

## Preconditions

- Production environment variables are set explicitly.
- `SECRET_KEY` is not left on the unsafe development default.
- `ALLOWED_HOSTS` is configured for the deployed hostname(s).
- TLS termination is in place before enabling the secure cookie and redirect settings.
- A database backup has been taken before applying migrations.

## Recommended Deployment Order

1. Pull the target commit on the server.
2. Install backend dependencies with `python -m pip install -r backend/requirements/production.txt`.
3. Export or update environment variables from the production secret store.
4. Run `python backend/manage.py check --settings=config.settings.production`.
5. Run `python backend/manage.py migrate --settings=config.settings.production`.
6. Run `python backend/manage.py collectstatic --noinput --settings=config.settings.production`.
7. Run `python backend/manage.py setup_roles --settings=config.settings.production`.
8. Run `python backend/manage.py seed_fund_accounts --settings=config.settings.production` if baseline funds are desired.
9. Run `python backend/manage.py seed_superuser --settings=config.settings.production` only when bootstrap credentials are intentionally provided.
10. Restart the application processes.

## Post-Deploy Smoke Checks

- Open `/admin/` and confirm the login page loads.
- Open `/api/docs/` and confirm the schema renders.
- Run an authenticated request against `/api/auth/me/`.
- Confirm read access for `/api/reports/dashboard/`.
- Confirm recent migrations are reflected in the database.
