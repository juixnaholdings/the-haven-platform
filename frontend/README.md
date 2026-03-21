# The Haven Frontend

This frontend is a Vite + React + TypeScript app with a small integration foundation for the Phase 1 backend.

## Current frontend integration architecture

- `src/api/`
  Shared API client, env-based config, timeout/error handling, and JWT-aware request logic.
- `src/auth/`
  Token storage, centralized auth/session state, and protected-route handling.
- `src/domains/`
  Domain API modules for `auth`, `members`, `households`, `groups`, `attendance`, `finance`, and `reporting`.
- `src/pages/`
  Minimal real screens wired to the backend: login, dashboard, and members.

## Environment

Copy `frontend/.env.example` to `frontend/.env` and adjust as needed.

- Local backend: `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Staging backend: `VITE_API_BASE_URL=https://staging.example.com`

## Auth/session approach

- Login uses `/api/auth/login/`
- Tokens are stored in local storage for the current browser
- Authenticated requests send `Authorization: Bearer <access>`
- Session bootstrap calls `/api/auth/me/` on app load
- A 401 triggers one refresh attempt through `/api/auth/token/refresh/`
- If refresh fails, local session state is cleared and protected routes redirect to `/login`

## Commands

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm run verify:backend`

## Real-backend verification

`npm run verify:backend` uses the same domain API modules as the browser app. It logs in, fetches `/api/auth/me/`, fetches `/api/reports/dashboard/`, fetches `/api/members/`, and prints a small success payload.

Required env vars for the script:

- `FRONTEND_VERIFY_USERNAME`
- `FRONTEND_VERIFY_PASSWORD`
- optional: `VITE_API_BASE_URL` or `FRONTEND_API_BASE_URL`
