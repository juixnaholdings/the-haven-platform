# Incident Response

Use this runbook for staging deployment failures and post-deploy regressions.

## First Checks

1. Confirm whether `/health/` is up.
2. Check `docker compose ps` for unhealthy containers.
3. Inspect backend logs and nginx logs before making changes.
4. Confirm the active `infra/.env.staging` file still matches the intended staging domain and database credentials.

## Useful Commands

- `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml ps`
- `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml logs backend --tail=200`
- `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml logs nginx --tail=200`
- `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml logs db --tail=200`
- `sh infra/scripts/staging_smoke_check.sh https://staging.example.com`

## Common Failure Patterns

- `manage.py check --deploy` fails:
  Usually a missing host, secret, or secure deployment variable in `infra/.env.staging`.
- Backend unhealthy:
  Check database connectivity first, then the value of `DATABASE_URL` and reverse-proxy headers.
- Admin/docs reachable but API failing:
  Check JWT signing, `ALLOWED_HOSTS`, CORS, and CSRF configuration.
- Migration failure:
  Stop and investigate before re-running the deploy. Do not keep restarting the stack blindly.

## Escalation Notes

- If a migration has partially applied, take a backup before any manual correction.
- Do not rewrite posted finance data to work around a deployment issue.
- Prefer rolling back to the previous known-good ref plus database backup over ad hoc container surgery.
