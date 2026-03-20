# Incident Response

Use this lightweight runbook for Phase 1 backend incidents.

## First Actions

1. Confirm whether the issue affects admin login, API auth, database access, or background infrastructure.
2. Capture the exact failing endpoint, timestamp, and release version.
3. Check recent deploys, migrations, and environment variable changes first.

## Common Recovery Checks

- `python backend/manage.py check`
- Verify database connectivity.
- Verify JWT signing key and secret configuration were not changed unexpectedly.
- Confirm `ALLOWED_HOSTS`, CORS, and CSRF settings still match the deployed hostname.
- Review recent role and superuser bootstrap activity if admin access changed.

## Escalation Notes

- Finance data issues should be treated as high priority because balances are computed directly from ledger lines.
- Migration failures should block further deploy attempts until the database state is understood.
- Do not delete or rewrite posted finance records as an incident shortcut.
