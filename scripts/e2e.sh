#!/usr/bin/env bash
# --harness proves A only; default runs the real B matrix. Always cleans its own project.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/isolated-auth.sh"
isolated_init
[[ $# -le 1 && ( $# == 0 || "$1" == --harness || "$1" == --runner-failure ) ]] || {
  echo 'Usage: e2e.sh [--harness|--runner-failure]' >&2; exit 2;
}
if [[ $# == 0 ]]; then
  # Product mode: host Node 24 runs the closed lifecycle/DB control (run-e2e.mjs). Fail before any build or resource.
  node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' 2>/dev/null || {
    echo 'e2e.sh: product mode requires Node >= 24 on the host (scripts/run-e2e.mjs)' >&2; exit 2;
  }
fi
PROJECT="${STOCKPILOT_E2E_PROJECT:-stockpilot-e2e-$(date +%s)-$$-$RANDOM}"
validate_project "$PROJECT"
[[ "$PROJECT" == stockpilot-e2e-* ]] || exit 2
export STOCKPILOT_E2E_ARTIFACTS="$ROOT/e2e/artifacts/$PROJECT"
# Git Bash maps Windows TEMP to /tmp; Docker must bind the native host path,
# shared with the Windows Node controller, rather than a different Linux /tmp.
if command -v cygpath >/dev/null 2>&1; then
  export STOCKPILOT_E2E_ARTIFACTS="$(cygpath -m "$STOCKPILOT_E2E_ARTIFACTS")"
fi
export APP_PUBLIC_URL=http://localhost
COMPOSE_ARGS=(compose --env-file scripts/fixtures/e2e.env.example -p "$PROJECT"
  -f docker-compose.yml -f compose.auth-test.yml -f docker-compose.e2e.yml --profile oidc --profile e2e)
assert_absent
mkdir -p "$STOCKPILOT_E2E_ARTIFACTS/control"
cp scripts/fixtures/oidc.json "$STOCKPILOT_E2E_ARTIFACTS/control/oidc.json"
install_cleanup # Before build/up: handles partial start, build failure and signals.
compose build server client e2e
compose up -d --wait --wait-timeout 300 db oidc server client
compose run --rm --no-deps e2e node harness/readiness.mjs
if [[ "${1:-}" == --harness ]]; then
  compose run --rm --no-deps e2e npm run harness
elif [[ "${1:-}" == --runner-failure ]]; then
  # Infrastructure assay only: explicit container failure, never product evidence.
  compose run --rm --no-deps e2e node -e 'process.exit(42)'
else
  # Prove this exact image's sanitizer (canaries, fail-closed refusal) before trusting any report it exports.
  compose run --rm --no-deps e2e python3 harness/test_sanitize.py
  node scripts/run-e2e.mjs "${COMPOSE_ARGS[@]}" &
  COMPOSE_PID=$!
  code=0
  wait "$COMPOSE_PID" || code=$?
  COMPOSE_PID=''
  exit "$code"
fi
