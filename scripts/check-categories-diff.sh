#!/usr/bin/env bash
set -euo pipefail

# Usage:
# 1) vercel env pull .env.vercel
# 2) source .env.vercel
# 3) bash scripts/check-categories-diff.sh

PROD_API_URL="${PROD_API_URL:-https://freuly.de}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-}}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_KEY" ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing"
  exit 1
fi

echo "== PROD API debug fingerprint =="
curl -s "${PROD_API_URL}/api/specialists/categories?mode=parents&include_children=1&min_count=0&debug=1" \
| jq '.meta._debug'

echo
echo "== Fetching PROD API parents =="
curl -s "${PROD_API_URL}/api/specialists/categories?mode=parents&include_children=1&min_count=0&debug=1" \
| jq -r '.data[] | [.slug, .id] | @tsv' \
| sort > "${TMP_DIR}/api_parents.tsv"

echo "== Fetching Supabase REST parents =="
curl -s "${SUPABASE_URL}/rest/v1/categories?select=id,slug,parent_id,is_active&parent_id=is.null&order=slug" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
| jq -r '.[] | select(.slug != null) | [.slug, .id] | @tsv' \
| sort > "${TMP_DIR}/rest_parents.tsv"

echo
echo "== API parents (slug -> id) =="
cat "${TMP_DIR}/api_parents.tsv"

echo
echo "== REST parents (slug -> id) =="
cat "${TMP_DIR}/rest_parents.tsv"

echo
echo "== missing_in_api (exists in REST, absent in API by slug) =="
comm -23 \
  <(cut -f1 "${TMP_DIR}/rest_parents.tsv" | sort) \
  <(cut -f1 "${TMP_DIR}/api_parents.tsv" | sort) || true

echo
echo "== missing_in_rest (exists in API, absent in REST by slug) =="
comm -13 \
  <(cut -f1 "${TMP_DIR}/rest_parents.tsv" | sort) \
  <(cut -f1 "${TMP_DIR}/api_parents.tsv" | sort) || true

echo
echo "== slug_same_but_id_diff =="
join -t $'\t' -j 1 \
  <(sort -k1,1 "${TMP_DIR}/api_parents.tsv") \
  <(sort -k1,1 "${TMP_DIR}/rest_parents.tsv") \
| awk -F '\t' '$2 != $3 {print $1 "\tapi_id=" $2 "\trest_id=" $3}' || true

echo
echo "== Summary =="
API_COUNT="$(wc -l < "${TMP_DIR}/api_parents.tsv" | tr -d ' ')"
REST_COUNT="$(wc -l < "${TMP_DIR}/rest_parents.tsv" | tr -d ' ')"
echo "api_parent_count=${API_COUNT}"
echo "rest_parent_count=${REST_COUNT}"
