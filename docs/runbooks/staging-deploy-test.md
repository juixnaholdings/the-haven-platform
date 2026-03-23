# Staging Deployment Test Runbook

## Purpose
This runbook verifies that the staging environment is deployment-ready before production rollout.

It validates:

- server bootstrap correctness
- staging Docker Compose startup
- same-origin frontend and backend routing
- authentication flow
- session reload flow
- health endpoint behavior
- GitHub Actions staging deploy readiness

---

## Preconditions

Before running this test, confirm all of these are true:

- the server bootstrap checklist is complete
- `/srv/the-haven-staging` exists
- the repo is cloned into `/srv/the-haven-staging`
- `/srv/the-haven-staging/infra/.env.staging` exists
- the `deploy` user can run Docker without sudo
- GitHub environment secrets for `staging` are already configured

---

## 1. Log into the server

```bash
ssh deploy@<SERVER_IP_OR_DOMAIN>
