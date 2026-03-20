# Frontend Integration Runbook

## Purpose

This runbook documents the frontend API integration foundation for The Haven.

## API base URL strategy

- Local frontend env file: `frontend/.env`
- Example template: `frontend/.env.example`
- Primary variable: `VITE_API_BASE_URL`

Recommended values:

- local backend: `http://127.0.0.1:8000`
- staging backend: `https://staging.example.com`

## Auth/session flow

1. `POST /api/auth/login/` returns `user` plus `access` and `refresh`.
2. Tokens are stored in browser local storage for the current frontend session.
3. App bootstrap calls `GET /api/auth/me/`.
4. Protected API requests attach the access token automatically.
5. A `401` triggers one refresh attempt through `POST /api/auth/token/refresh/`.
6. If refresh fails, the frontend clears session state and protected routes fall back to `/login`.

## Domain API modules

- `authApi`
- `membersApi`
- `householdsApi`
- `groupsApi`
- `attendanceApi`
- `financeApi`
- `reportingApi`

These modules live under `frontend/src/domains/` and wrap the backend response envelope through the shared `frontend/src/api/client.ts`.

## Minimal real UI wiring

- `/login`
  real login against backend JWT auth
- `/dashboard`
  protected dashboard overview from reporting
- `/members`
  protected members list using the members domain module

## Verification

Run from `frontend/`:

- `npm run typecheck`
- `npm run build`
- `npm run verify:backend`

For real-backend verification, export:

- `FRONTEND_VERIFY_USERNAME`
- `FRONTEND_VERIFY_PASSWORD`
- optional: `VITE_API_BASE_URL`
