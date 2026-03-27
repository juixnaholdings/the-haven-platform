# The Haven

Church operations platform covering members, households, ministries, events, attendance, finance, reports, settings, and audit.

## Active frontend

- Primary frontend (active): `frontend-next/` (Next.js App Router)
- Legacy frontend snapshot (inactive): `frontend/` (Vite)

## Top-level structure

- `backend/` Django API/backend
- `frontend-next/` active product frontend
- `frontend/` legacy snapshot for rollback/reference
- `infra/` deployment and compose assets
- `docs/` architecture, runbooks, and product docs
- `scripts/` helper scripts
- `.github/` CI/CD workflows
