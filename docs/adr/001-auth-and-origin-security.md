# ADR 0001: Authentication, Origin, and Transport Security Baseline

## Status
Accepted

## Context
The project currently has a frontend API integration foundation using JWT-based authentication.
The initial implementation stored token pairs in browser localStorage.

This project handles sensitive member and finance data.
We do not want browser-persistent token storage to become permanent.

## Decision
We will adopt the following security baseline:

1. Access tokens will be short-lived and kept in memory on the frontend.
2. Refresh tokens will be issued and stored in a Secure, HttpOnly cookie.
3. Refresh tokens will be rotated.
4. Refresh tokens will be blacklisted on logout and after rotation when applicable.
5. Production traffic will run over HTTPS only.
6. Frontend and API will be served under one HTTPS origin where feasible.
7. CORS will be explicit and restrictive.
8. CSRF protection will be enabled and correctly configured for cookie-based flows.
9. Security changes must land through PRs with required checks.

## Rationale
- OWASP advises against storing session identifiers in localStorage.
- HttpOnly cookies reduce JavaScript exposure for refresh tokens.
- HTTPS-only transport is required for secure cookie handling.
- One-origin deployment simplifies cookies, CSRF, and CORS.

## Consequences
- Frontend auth handling becomes more complex but more secure.
- Backend auth endpoints will change shape.
- Local development must support cookie-based auth properly.
- Reverse proxy and environment settings become part of the security boundary.