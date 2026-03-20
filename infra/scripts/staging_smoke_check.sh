#!/usr/bin/env sh
set -eu

BASE_URL="${1:-${STAGING_BASE_URL:-}}"
API_PREFIX="${API_PREFIX:-api}"
CURL_INSECURE="${CURL_INSECURE:-0}"

if [ -z "$BASE_URL" ]; then
    echo "Usage: staging_smoke_check.sh <base-url>" >&2
    exit 1
fi

curl_with_code() {
    path="$1"
    method="${2:-GET}"
    data="${3:-}"

    if [ "$CURL_INSECURE" = "1" ]; then
        insecure_flag="--insecure"
    else
        insecure_flag=""
    fi

    if [ -n "$data" ]; then
        curl --silent --show-error $insecure_flag --output /tmp/haven-smoke.out \
            --write-out "%{http_code}" --request "$method" \
            --header "Content-Type: application/json" --data "$data" \
            "$BASE_URL$path"
        return
    fi

    curl --silent --show-error $insecure_flag --output /tmp/haven-smoke.out \
        --write-out "%{http_code}" --request "$method" \
        "$BASE_URL$path"
}

assert_status() {
    path="$1"
    expected="$2"
    method="${3:-GET}"
    data="${4:-}"
    status_code="$(curl_with_code "$path" "$method" "$data")"

    if [ "$status_code" != "$expected" ]; then
        echo "Smoke check failed for $path: expected $expected, got $status_code" >&2
        cat /tmp/haven-smoke.out >&2
        exit 1
    fi
}

assert_status "/health/" "200"
assert_status "/admin/login/" "200"
assert_status "/$API_PREFIX/schema" "200"
assert_status "/$API_PREFIX/docs/" "200"
assert_status "/$API_PREFIX/auth/login/" "400" "POST" "{}"

echo "Staging smoke checks passed for $BASE_URL"
