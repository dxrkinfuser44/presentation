#!/usr/bin/env bash
# ── Smoke Test ──────────────────────────────────────────────────────────────
# Curls / and /api/presentations after npm start, checks for 200 and valid
# JSON shape. Exits non-zero on any failure.
#
# Usage: bash scripts/smoke-test.sh [PORT]
#   PORT defaults to 3000
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PORT="${1:-3000}"
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

# ── Helpers ─────────────────────────────────────────────────────────────────

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; ((PASS++)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; ((FAIL++)); }

# ── Pre-flight: wait for server ─────────────────────────────────────────────
echo "Waiting for server on port ${PORT}…"
for i in $(seq 1 10); do
  if curl -sf -o /dev/null "${BASE}/" 2>/dev/null; then
    echo "Server is up.\n"
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "ERROR: Server not reachable at ${BASE} after 10 attempts."
    exit 1
  fi
  sleep 1
done

# ── Test 1: GET / returns 200 and contains <div id="app"> ──────────────────
echo "Test: GET /"

HTTP_CODE=$(curl -s -o /tmp/smoke_body -w "%{http_code}" "${BASE}/")
BODY=$(cat /tmp/smoke_body)

if [ "$HTTP_CODE" -ne 200 ]; then
  fail "Expected HTTP 200, got ${HTTP_CODE}"
else
  pass "HTTP 200"
fi

if echo "$BODY" | grep -q '<div id="app">'; then
  pass "Response contains <div id=\"app\">"
else
  fail "Response missing <div id=\"app\">"
fi

# ── Test 2: GET /api/presentations returns 200 and valid JSON ──────────────
echo "\nTest: GET /api/presentations"

HTTP_CODE=$(curl -s -o /tmp/smoke_api -w "%{http_code}" "${BASE}/api/presentations")
API_BODY=$(cat /tmp/smoke_api)

if [ "$HTTP_CODE" -ne 200 ]; then
  fail "Expected HTTP 200, got ${HTTP_CODE}"
else
  pass "HTTP 200"
fi

# Validate JSON parse
if echo "$API_BODY" | python3 -m json.tool > /dev/null 2>&1; then
  pass "Valid JSON"
else
  fail "Response is not valid JSON"
fi

# Validate JSON shape: must have a "presentations" array
PRESENTATIONS=$(echo "$API_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data.get('presentations'), list):
    print(len(data['presentations']))
else:
    print('')
" 2>/dev/null)

if [ -n "$PRESENTATIONS" ]; then
  pass "JSON has 'presentations' array (${PRESENTATIONS} items)"
else
  fail "JSON missing 'presentations' array"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

exit 0
