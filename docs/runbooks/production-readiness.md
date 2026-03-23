# Production Readiness Checklist

## Purpose
This runbook confirms whether The Haven is ready for a first controlled production deployment.

It should be completed only after:
- staging deploy workflow succeeds
- staging app works correctly after deployment
- security hardening phases are complete
- production HTTPS/TLS repo artifacts already exist

This checklist is for readiness review.
It is not the production rollout procedure itself.

---

## 1. Staging must be fully validated first

Before approving production, confirm all of the following are true in staging:

- the GitHub `deploy-staging` workflow completes successfully
- the app loads through Nginx
- login works
- reload works
- protected pages load
- admin loads
- backend health endpoint returns 200
- frontend requests use the correct same-origin `/api/...` path
- no browser requests point to the wrong backend origin
- no unexpected auth redirect loops remain

If any of these fail, production is not ready.

---

## 2. Production server bootstrap must already be complete

Confirm all of the following are true on the production server:

- the `deploy` user exists
- the `deploy` user can run Docker without sudo
- SSH access works using the GitHub Actions deploy key
- `/srv/the-haven` exists
- the repository is cloned into `/srv/the-haven`
- `/srv/the-haven/infra/.env.production` exists
- `docker compose --env-file infra/.env.production -f infra/compose.production.yaml config` succeeds

If any of these fail, production is not ready.

---

## 3. Production environment file review

Confirm `infra/.env.production` on the server contains correct values for:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `SECRET_KEY`
- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `ALLOWED_HOSTS`
- `APP_DOMAIN`
- `HTTP_PORT`
- `HTTPS_PORT`
- `LETSENCRYPT_DIR`
- `CERTBOT_WEBROOT`

Also confirm production security values are enabled:

```env
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
AUTH_REFRESH_COOKIE_SECURE=True
AUTH_REFRESH_COOKIE_NAME=__Host-refresh
