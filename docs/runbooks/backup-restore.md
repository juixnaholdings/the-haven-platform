# Backup and Restore

Phase 1 relies on the primary relational database as the source of truth for members, attendance, finance, and reporting inputs.

## Backup Expectations

- Take a database backup before every production deployment that includes migrations.
- Keep at least one daily backup and one pre-release backup during the Phase 1 rollout period.
- Store backups outside the application host.
- Verify restoreability periodically, not just backup creation.

## SQLite Development Backups

- Stop local write activity before copying the SQLite file.
- Copy `backend/db.sqlite3` to a dated backup location.

## PostgreSQL Production Backups

- Use `pg_dump` for logical backups of the production database.
- Include role, extension, and restore instructions in infrastructure operations documentation.
- Encrypt backups at rest in the destination storage system.

## Restore Order

1. Put the application into maintenance mode or stop write traffic.
2. Restore the database backup.
3. Re-apply the same application release that matches the restored schema.
4. Run `python backend/manage.py check`.
5. Verify admin login, API auth, and dashboard/reporting reads before reopening traffic.
