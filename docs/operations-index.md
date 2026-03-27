# Operations Index

## Purpose

This document is the operational map for The Haven.

Use it as the entry point for:

- deployment workflows
- environment templates
- infrastructure configs
- security and rollout runbooks
- migration cutover readiness references

## 1. Branch and environment model

### Branches

- `develop` -> staging/integration
- `main` -> production

### Deployment targets

- `develop` -> staging
- `main` -> production

### GitHub environments

- `staging`
- `production`

## 2. GitHub Actions workflows

### CI workflow

- `.github/workflows/ci.yml`

## 3. Next migration operations references

Use these docs for Next cutover planning and QA/readiness:

- `docs/nextjs-migration-plan.md`
- `docs/nextjs-cutover-readiness.md`
- `docs/runbooks/nextjs-staged-cutover.md`
- `docs/runbooks/nextjs-staging-verification-checklist.md`
- `frontend-next/README.md`

Current rollout rule:

- The Vite app in `frontend/` remains the rollback target until staged cutover is accepted.
