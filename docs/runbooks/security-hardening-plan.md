# Security Hardening Runbook

## Current baseline
- Active integration branch is develop
- All security changes land through pull requests into develop
- CI validates backend and frontend
- Security workflow scans code and dependencies
- develop and main are protected branches

## Upcoming phases
1. Backend auth cookie rotation
2. Frontend in-memory access token flow
3. Same-origin TLS reverse proxy
4. Django security settings and CSRF hardening
5. Production hardening and deployment runbooks
6. Release promotion from develop to main

## Non-negotiable rules
- No auth tokens in localStorage
- No wildcard CORS in production
- No HTTP in production
- No direct pushes to develop or main
- No secrets committed to the repo
- All auth changes require manual verification notes in PRs