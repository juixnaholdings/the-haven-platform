# Frontend Next (Parallel Migration App)

This folder contains the parallel Next.js App Router migration frontend for The Haven.

Current production/staging frontend remains the Vite app in `frontend/`.
This app is migration work only and is developed on the long-running branch:

- `feat/nextjs-migration`

## Milestone 0 scope

- App Router + TypeScript foundation
- route groups for `(auth)` and `(dashboard)`
- root layout, global styles, error boundary, and not-found route
- auth/session provider scaffolding (not yet wired to Django auth endpoints)
- login and dashboard starter pages
- migration-ready folders under `src/`
- environment/config foundation for Django API base URL

## Local usage

From `frontend-next/`:

```bash
npm install
npm run dev
```

App URL:

- `http://localhost:3000`

Required environment:

- copy `.env.example` to `.env.local`
- set `NEXT_PUBLIC_API_BASE_URL` to your Django backend (for local: `http://localhost:8000`)

Validation commands:

```bash
npm run lint
npm run typecheck
npm run build
```

## Notes

- The dashboard route currently runs in preview mode until Milestone 1 wires protected-session enforcement to real auth endpoints.
- No domain pages are migrated in Milestone 0.
