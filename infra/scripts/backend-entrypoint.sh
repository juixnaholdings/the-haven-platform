#!/bin/sh
set -eu

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

if [ "${ENABLE_SUPERUSER_SEED:-False}" = "True" ] || [ "${ENABLE_SUPERUSER_SEED:-false}" = "true" ]; then
  if [ -z "${DJANGO_SUPERUSER_USERNAME:-}" ]  [ -z "${DJANGO_SUPERUSER_EMAIL:-}" ]  [ -z "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
    echo "ENABLE_SUPERUSER_SEED is enabled, but superuser environment variables are incomplete."
    exit 1
  fi

  echo "ENABLE_SUPERUSER_SEED is enabled. Seeding superuser..."
  python manage.py seed_superuser
else
  echo "ENABLE_SUPERUSER_SEED is disabled. Skipping superuser seed."
fi

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-60}" \
  --access-logfile - \
  --error-logfile -