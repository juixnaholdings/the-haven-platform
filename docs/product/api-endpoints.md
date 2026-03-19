# API Authentication Endpoints

All API routes are mounted under the configured API prefix, which defaults to `/api/`.

## Public Auth Endpoints

- `POST /api/auth/login/`
  Returns the authenticated user payload plus `access` and `refresh` tokens in the standard response envelope.
- `POST /api/auth/logout/`
  Requires bearer authentication and accepts a refresh token to blacklist.
- `POST /api/auth/token/refresh/`
  Returns a refreshed access token in the standard response envelope.
- `POST /api/auth/token/verify/`
  Verifies an access token and returns the standard success envelope.
- `GET /api/auth/me/`
  Returns the current authenticated user for the supplied bearer token.

## Admin

- `/admin/` uses normal Django admin session authentication.
- Admin UI is styled with Jazzmin and is separate from API JWT auth.
