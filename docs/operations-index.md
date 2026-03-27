# Operations Index

## Purpose

Operational map for deployment, verification, and release controls in The Haven.

## Branch and environment model

- `develop` -> staging/integration
- `main` -> production
- GitHub environments:
  - `staging`
  - `production`

## Active frontend

- Primary frontend: `frontend-next/`
- Legacy snapshot only: `frontend/`

## Core workflows

- CI: `.github/workflows/ci.yml`
- Security: `.github/workflows/security.yml`
- Staging deploy: `.github/workflows/deploy-staging.yml`
- Production deploy: `.github/workflows/deploy-production.yml`

## Next frontend adoption references

- `docs/nextjs-migration-plan.md`
- `docs/nextjs-cutover-readiness.md`
- `docs/runbooks/nextjs-staging-verification-checklist.md`
- `frontend-next/README.md`

Historical record:
- `docs/runbooks/nextjs-staged-cutover.md`

## Deployment/runbooks

- `docs/runbooks/local-setup.md`
- `docs/runbooks/deployment.md`
- `docs/runbooks/release-checklist.md`
- `docs/runbooks/production-rollout.md`
- `docs/runbooks/backup-restore.md`

## Rollback posture

- Legacy Vite snapshot in `frontend/` is retained as a rollback reference only.
- Primary operational path remains `frontend-next/`.
