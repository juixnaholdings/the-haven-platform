<<<<<<< HEAD
﻿
=======
# Local Backend Setup

Use `backend/.env.example` as the source-of-truth environment template for local backend work.
Use `infra/.env.staging.example` only for VPS staging deployments.

## 1. Install and Configure

- Create and activate a Python virtual environment inside `backend/`.
- Install backend dependencies with `python -m pip install -r backend/requirements/dev.txt`.
- Copy `backend/.env.example` to `backend/.env` and adjust values for your machine.

## 2. Bootstrap the Database

Run these commands from the repo root:

- `python backend/manage.py migrate`
- `python backend/manage.py setup_roles`
- `python backend/manage.py seed_superuser`
- `python backend/manage.py seed_fund_accounts`

## 3. Authentication and Admin

- API authentication uses JWT bearer tokens under `/api/auth/`.
- Django admin uses the normal Django admin login and session flow at `/admin/`.
- Jazzmin is enabled for the admin UI.
- API schema and interactive docs are exposed at `/api/schema` and `/api/docs/`.

## 4. Key Environment Variables

- `DEBUG`
- `SECRET_KEY`
- `JWT_SIGNING_KEY`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `JWT_ROTATE_REFRESH_TOKENS`
- `JWT_BLACKLIST_AFTER_ROTATION`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `DJANGO_SUPERUSER_USERNAME`
- `DJANGO_SUPERUSER_EMAIL`
- `DJANGO_SUPERUSER_PASSWORD`

## 5. Local Validation Commands

- `python backend/manage.py check`
- `python backend/manage.py makemigrations --check --dry-run`
- `pytest`

## 6. Frontend Local Setup

- Install frontend dependencies with `npm install` inside `frontend/`.
- Copy `frontend/.env.example` to `frontend/.env`.
- Point `VITE_API_BASE_URL` to the backend you want to use.
- Run `npm run dev` from `frontend/`.
- The local backend `.env.example` already allows the default Vite origin at `http://localhost:5173`.

## 7. Frontend Validation Commands

- `npm run typecheck`
- `npm run build`
- `npm run verify:backend`

`npm run verify:backend` requires:

- `FRONTEND_VERIFY_USERNAME`
- `FRONTEND_VERIFY_PASSWORD`
- optional: `VITE_API_BASE_URL`

## 8. Staging Artifacts

- Local development does not use the staging compose stack.
- The staging deployment path lives under `infra/compose.staging.yaml`.
- `infra/.env.staging` is the only intended staging env file. Do not mirror those values into `backend/.env` on the VPS.
- The staging smoke verification script lives at `infra/scripts/staging_smoke_check.sh`.
>>>>>>> develop
