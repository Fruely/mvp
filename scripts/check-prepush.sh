#!/usr/bin/env bash
set -euo pipefail

PORT="${PREPUSH_PORT:-3100}"
BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:${PORT}}"
START_LOG=".next/prepush-start.log"

echo "==> Running lint"
npm run lint

echo "==> Running production build"
npm run build

echo "==> Starting production server on port ${PORT}"
PORT="${PORT}" npm run start >"${START_LOG}" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> Waiting for server readiness at ${BASE_URL}"
for _ in {1..30}; do
  if curl -s -o /dev/null "${BASE_URL}"; then
    break
  fi
  sleep 1
done

if ! curl -s -o /dev/null "${BASE_URL}"; then
  echo "Failed to start production server. See ${START_LOG}"
  exit 1
fi

check_status() {
  local url="$1"
  local expected="$2"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "${status}" != "${expected}" ]]; then
    echo "Smoke check failed: ${url} expected ${expected}, got ${status}"
    exit 1
  fi
  echo "OK ${expected} ${url}"
}

check_post_status() {
  local url="$1"
  local expected="$2"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d '{}' || true)"
  if [[ "${status}" != "${expected}" ]]; then
    echo "Smoke check failed: POST ${url} expected ${expected}, got ${status}"
    exit 1
  fi
  echo "OK ${expected} POST ${url}"
}

echo "==> Running smoke checks against ${BASE_URL}"
check_status "${BASE_URL}/ua" "200"
check_status "${BASE_URL}/ua/category/tutors" "308"
check_status "${BASE_URL}/ua/specialists/tutors" "200"
check_status "${BASE_URL}/api/specialists/categories" "200"
check_post_status "${BASE_URL}/api/specialists/create" "410"

echo "==> Pre-push checks passed"
