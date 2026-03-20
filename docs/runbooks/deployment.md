# Deployment Runbook

This runbook documents the practical staging deployment path for The Haven on a single VPS.

## Staging Topology

- Docker Compose stack at `infra/compose.staging.yaml`
- `backend` service running Django through Gunicorn
- `nginx` service reverse proxying requests to the backend container
- `db` service running PostgreSQL inside the private Compose network
- Named Docker volumes for PostgreSQL data, collected static files, and media files

## First-Time Server Bootstrap

1. Install Docker Engine and the Docker Compose plugin on the VPS.
2. Create a deploy directory such as `/srv/the-haven`.
3. Clone the repository into that directory.
4. Copy `infra/.env.staging.example` to `infra/.env.staging`.
5. Replace every placeholder secret and domain value in `infra/.env.staging`.
6. Confirm the staging domain points to the VPS and that port 80 is reachable.
7. Keep PostgreSQL private to the Compose network. Do not expose port `5432` publicly.

## Required Staging Env File

`infra/.env.staging` is the source-of-truth env file for Compose and the backend container.

Required values include:

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DEBUG=False`
- `SECRET_KEY`
- `JWT_SIGNING_KEY`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `STAGING_BASE_URL`

## Deploy Flow

The repo now includes `infra/scripts/deploy_staging.sh` for the server-side deploy path.

Run from the repo root on the server:

- `cp infra/.env.staging.example infra/.env.staging`
- `sh infra/scripts/deploy_staging.sh`

The deploy script will:

1. Build the backend and nginx images.
2. Start PostgreSQL.
3. Run migrations with `config.settings.production`.
4. Collect static assets into the shared Docker volume.
5. Run `manage.py check --deploy`.
6. Re-seed baseline roles and fund accounts idempotently.
7. Start or refresh the backend and nginx services.

## GitHub Actions Staging Deploy

The repo also includes `.github/workflows/deploy-staging.yml`.

Expected staging environment secrets:

- `STAGING_SSH_HOST`
- `STAGING_SSH_USER`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_DEPLOY_PATH`
- `STAGING_BASE_URL`

The workflow is manual by design. It SSHes to the staging server, runs `infra/scripts/deploy_staging.sh`, and can optionally run the smoke checks afterward.

## Smoke Verification

Run locally or in CI:

- `sh infra/scripts/staging_smoke_check.sh https://staging.example.com`

The smoke script verifies:

- `/health/`
- `/admin/login/`
- `/api/schema`
- `/api/docs/`
- `/api/auth/login/` returns the expected validation response shape

## Rollback Basics

1. Take a fresh database backup before attempting rollback.
2. Check out the previous known-good ref on the server.
3. Re-run `sh infra/scripts/deploy_staging.sh`.
4. If the failed release included irreversible migrations, restore the database backup before reopening traffic.

## TLS Expectations

- The nginx config is HTTP and reverse-proxy ready.
- For real HTTPS on staging, terminate TLS either in nginx with mounted certificates or in an upstream load balancer.
- Keep `SECURE_SSL_REDIRECT`, secure cookies, and `CSRF_TRUSTED_ORIGINS` aligned with the actual staging URL.
