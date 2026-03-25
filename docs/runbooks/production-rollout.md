# Production Rollout Runbook

## Purpose
This runbook defines the exact procedure for a controlled production deployment of The Haven.

It assumes:

- staging has already been validated successfully
- the production server has been bootstrapped
- the production env file exists on the server
- TLS certificates already exist and are valid
- the production Docker Compose stack is ready
- the production GitHub environment requires approval

This runbook is for the actual rollout procedure.

---

## Preconditions

Before starting production rollout, confirm all of the following are true:

- staging deployment workflow has succeeded
- staging app behavior has been fully verified
- production readiness checklist has been completed
- production domain DNS points to the correct server
- TLS certificate files exist for the production domain
- production environment secrets in GitHub are correct
- `/srv/the-haven` exists on the server
- `/srv/the-haven/infra/.env.production` exists on the server
- production compose config validates successfully
- a rollback plan exists
- a known-good Git ref or release tag is identified

If any of these are not true, do not proceed.

---

## Release reference

Before rollout, identify the exact code version being deployed.

Recommended:
- deploy from `main`
- create a release tag before rollout

Example:

```bash
git checkout main
git pull origin main
git tag -a v0.1.0 -m "First controlled production rollout"
git push origin v0.1.0
