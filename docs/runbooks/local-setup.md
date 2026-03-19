# Local Backend Setup

Use `backend/.env.example` as the backend environment template.

## Auth and Admin

- API authentication uses JWT bearer tokens.
- Django admin uses the normal Django admin login and session flow at `/admin/`.
- Jazzmin is enabled for the admin UI.

## Key Environment Variables

- `JWT_SIGNING_KEY`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `JWT_ROTATE_REFRESH_TOKENS`
- `JWT_BLACKLIST_AFTER_ROTATION`
- `DJANGO_SUPERUSER_USERNAME`
- `DJANGO_SUPERUSER_EMAIL`
- `DJANGO_SUPERUSER_PASSWORD`

## Bootstrap Commands

- `python backend/manage.py migrate`
- `python backend/manage.py setup_roles`
- `python backend/manage.py seed_superuser`
