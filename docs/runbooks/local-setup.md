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
- `python backend/manage.py seed_demo_data --reset`

Canonical demo-data path:

- `seed_demo_data` is the primary local/dev bootstrap command for realistic product data.
- Default run (`--count 24`) seeds practical volume across users, members, households, groups, events/attendance, finance, and audit records.
- Use `--count` (allowed: `5-60`) to scale data volume.
- Sunday services are system-managed in this flow:
  - past horizon: `--sunday-weeks-back` (default `8`)
  - future horizon: `--sunday-weeks-forward` (default `12`)
- Seeded attendance includes both summary and member-level records across those Sunday services so attendance/reporting Sunday status cards are immediately testable in `frontend-next`.
- For Sunday-service-only refreshes without reseeding all product data, use:
  - `python backend/manage.py ensure_sunday_services`

## 3. Authentication and Admin

- API authentication uses JWT bearer tokens under `/api/auth/`.
- Django admin uses the normal Django admin login and session flow at `/admin/`.
- Jazzmin is enabled for the admin UI.
- API schema and interactive docs are exposed at `/api/schema` and `/api/docs/`.
- Staff onboarding lifecycle in local/dev:
  - public signup (`/signup`) creates safe basic users with no staff/admin roles
  - admins elevate those users in `frontend-next` at `/settings/staff`
  - admins can also create staff invite links and share them manually
  - invite acceptance route: `/staff-invite/{staff_invite_id}?token=...`

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

- Install frontend dependencies with `npm install` inside `frontend-next/`.
- Copy `frontend-next/.env.example` to `frontend-next/.env.local`.
- Point `NEXT_PUBLIC_API_BASE_URL` to the backend you want to use.
- Run `npm run dev` from `frontend-next/`.
- Primary local frontend URL is `http://localhost:3000`.
- Dashboard quick actions (`Add Event`, `Record Attendance`) now launch modal-first workflows using existing attendance APIs.

## 7. Frontend Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`

Smoke coverage is contract-mocked and should be paired with real-backend manual checks before release decisions.

## 8. Staging Artifacts

- Local development does not use the staging compose stack.
- The staging deployment path lives under `infra/compose.staging.yaml`.
- `infra/.env.staging` is the only intended staging env file. Do not mirror those values into `backend/.env` on the VPS.
- The staging smoke verification script lives at `infra/scripts/staging_smoke_check.sh`.
