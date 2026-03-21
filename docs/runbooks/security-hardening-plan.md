# Security Hardening Runbook

## Current baseline
- Repo uses PR-based changes only
- CI validates backend and frontend
- Security workflow scans Python code and dependencies
- Main branch is protected

## Upcoming phases
1. Backend auth cookie rotation
2. Frontend in-memory access token flow
3. Same-origin TLS reverse proxy
4. Django security settings and CSRF hardening
5. Production hardening and deployment runbooks

## Non-negotiable rules
- No auth tokens in localStorage
- No wildcard CORS in production
- No HTTP in production
- No direct pushes to main
- No secrets committed to the repo
- All auth changes require manual verification notes in PRs