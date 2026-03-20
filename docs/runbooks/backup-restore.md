# Backup and Restore

Staging should be treated as a real database-backed environment even though it is not production.

## Staging Backup Expectations

- Take a PostgreSQL backup before every staging deployment that includes migrations.
- Keep at least one recent rollback-ready snapshot during active testing.
- Store backups outside the VPS filesystem when possible.
- Verify restoreability periodically with a test restore.

## Recommended Staging Backup Command

From the staging VPS:

- `docker compose --env-file infra/.env.staging -f infra/compose.staging.yaml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > staging-backup.sql`

## Restore Order

1. Put staging into maintenance mode or stop the backend and nginx services.
2. Restore the PostgreSQL dump into the `db` container or replacement database.
3. Re-check out the matching application ref if the database schema is being rolled back with the release.
4. Re-run `sh infra/scripts/deploy_staging.sh`.
5. Run `sh infra/scripts/staging_smoke_check.sh https://staging.example.com` before reopening access.

## Notes

- Do not rely on the application container filesystem as the only copy of uploaded media.
- Finance data should be treated as operationally sensitive even in staging because ledger behavior is part of release verification.
