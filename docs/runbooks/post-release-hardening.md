# Post-Release Hardening Backlog

## Purpose
This runbook captures the security, reliability, and operational improvements that should happen after the first secure production release path is in place.

These items are not blockers for the first controlled rollout, but they are important for maturing the platform.

---

## Priority model

### P0
Must be done soon after first production release.

### P1
High-value improvements for reliability and security.

### P2
Nice-to-have operational maturity improvements.

---

## P0 — immediate post-release hardening

### 1. Raise HSTS gradually
Current first-rollout posture should stay conservative.

Target progression:

1. initial:
   - `SECURE_HSTS_SECONDS=3600`
   - `SECURE_HSTS_INCLUDE_SUBDOMAINS=False`
   - `SECURE_HSTS_PRELOAD=False`

2. after production stability is confirmed:
   - `SECURE_HSTS_SECONDS=31536000`

3. only after full review:
   - `SECURE_HSTS_INCLUDE_SUBDOMAINS=True`
   - optionally `SECURE_HSTS_PRELOAD=True`

### Why
HSTS is powerful, but a wrong configuration can lock browsers into HTTPS expectations prematurely.

---

### 2. Automate certificate renewal verification
Certbot renewal should not be assumed safe without testing.

Required:
- confirm `certbot renew --dry-run` works
- add a server-side renewal timer or cron verification
- confirm Nginx reload behavior after renewal

### Goal
No manual certificate firefighting.

---

### 3. Add production smoke test script
Create a single script or checklist that verifies:

- homepage loads
- login endpoint responds
- protected endpoint responds after auth
- admin loads
- HTTP redirects to HTTPS
- HTTPS serves correctly

### Goal
Fast validation after every deploy.

---

### 4. Remove any remaining local-only production shortcuts
Review production env and config for leftovers such as:
- non-secure cookie settings
- weak dev defaults
- temporary debug allowances
- staging-style host settings

### Goal
Production should be fully production-shaped.

---

## P1 — important maturity improvements

### 5. Add database backup strategy
Define:
- backup frequency
- storage location
- retention policy
- restore testing frequency

Minimum expectation:
- automated Postgres dump
- off-server backup copy
- documented restore procedure

### Goal
No production system is mature without tested backups.

---

### 6. Add application monitoring
At minimum:
- container status monitoring
- disk usage monitoring
- memory/CPU monitoring
- failed deploy visibility
- uptime checks on public endpoints

### Goal
Know about failures before users tell you.

---

### 7. Add structured audit logging
Important actions to log:
- login attempts
- logout
- refresh failures
- member updates
- attendance edits
- finance record creation/edits/reversals
- role/permission changes

### Goal
Security and accountability for church operations data.

---

### 8. Add rate limiting beyond auth
Current throttling should exist for login/refresh/logout.

Expand later to:
- sensitive reporting endpoints
- expensive list endpoints
- admin write endpoints

### Goal
Reduce abuse and accidental overload.

---

### 9. Review CSP and security headers
Current headers should later be strengthened with:
- Content-Security-Policy
- frame ancestor restrictions
- tighter asset loading policy

Do this carefully to avoid breaking the SPA.

### Goal
Reduce XSS and content injection risk.

---

### 10. Review Cloudflare configuration
If Cloudflare is in front:
- verify SSL mode is correct
- verify caching is not breaking auth
- verify firewall rules do not block legitimate app paths
- verify origin IP restrictions are deliberate

### Goal
Edge layer should support, not fight, the origin setup.

---

## P2 — longer-term improvements

### 11. Move staging to full HTTPS too
Current staging may still be HTTP-based in some phases.

Long-term:
- give staging its own domain/subdomain
- issue a real cert
- run staging with production-like secure cookies

### Goal
Reduce drift between staging and production.

---

### 12. Add deploy previews or release notes discipline
For every release, record:
- commit/tag
- user-visible changes
- migration notes
- rollback notes

### Goal
Better operational clarity.

---

### 13. Add container image scanning
Scan images used in deployment for vulnerabilities.

Targets:
- backend image
- nginx image
- any future worker images

### Goal
Catch base image and dependency risks earlier.

---

### 14. Add dependency update policy
Define:
- how often Python deps are reviewed
- how often frontend deps are reviewed
- how urgent security patching is handled

### Goal
Prevent silent dependency drift.

---

### 15. Add disaster recovery notes
Document:
- how to rebuild server from scratch
- how to restore env files
- how to restore database backups
- how to restore certificates
- how to reattach DNS/proxy configuration

### Goal
The system should be recoverable, not just deployable.

---

## Recommended implementation order

### First wave
1. certificate renewal verification
2. production smoke test
3. database backup plan
4. monitoring baseline

### Second wave
5. audit logging
6. CSP/security header review
7. Cloudflare review

### Third wave
8. staging HTTPS
9. image scanning
10. disaster recovery documentation

---

## Tracking template

Use this template for each hardening item:

```text
Title:
Priority:
Owner:
Status:
Target date:
Notes:
