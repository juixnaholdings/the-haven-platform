#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/compose.staging.yaml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/infra/.env.staging}"
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
DEPLOY_REF="${DEPLOY_REF:-}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Compose file not found: $COMPOSE_FILE" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found: $ENV_FILE" >&2
    exit 1
fi

if [ -n "$DEPLOY_REF" ] && [ -d "$ROOT_DIR/.git" ]; then
    git -C "$ROOT_DIR" fetch origin "$DEPLOY_REF"
    git -C "$ROOT_DIR" checkout "$DEPLOY_REF"
    if git -C "$ROOT_DIR" ls-remote --exit-code --heads origin "$DEPLOY_REF" >/dev/null 2>&1; then
        git -C "$ROOT_DIR" pull --ff-only origin "$DEPLOY_REF"
    fi
fi

COMPOSE="docker compose --env-file $ENV_FILE -f $COMPOSE_FILE"

cd "$ROOT_DIR"

$COMPOSE build backend frontend nginx
$COMPOSE up -d db
$COMPOSE run --rm backend python manage.py migrate --settings="$DJANGO_SETTINGS_MODULE"
$COMPOSE run --rm backend python manage.py collectstatic --noinput --settings="$DJANGO_SETTINGS_MODULE"
$COMPOSE run --rm backend python manage.py check --deploy --settings="$DJANGO_SETTINGS_MODULE"
$COMPOSE run --rm backend python manage.py setup_roles --settings="$DJANGO_SETTINGS_MODULE"
$COMPOSE run --rm backend python manage.py seed_fund_accounts --settings="$DJANGO_SETTINGS_MODULE"
$COMPOSE up -d backend frontend nginx
$COMPOSE ps
