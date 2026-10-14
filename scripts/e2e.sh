#!/usr/bin/env bash
# --harness proves A only; default runs B and fails if B has no tests. Always cleans its own project.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/isolated-auth.sh"
isolated_init
[[ $# -le 1 && ( $# == 0 || "$1" == --harness ) ]] || { echo 'Usage: e2e.sh [--harness]' >&2; exit 2; }
PROJECT="${STOCKPILOT_E2E_PROJECT:-stockpilot-e2e-$(date +%s)-$$-$RANDOM}"
validate_project "$PROJECT"
[[ "$PROJECT" == stockpilot-e2e-* ]] || exit 2
export STOCKPILOT_E2E_ARTIFACTS="$ROOT/e2e/artifacts/$PROJECT"
export APP_PUBLIC_URL=http://localhost
COMPOSE_ARGS=(compose --env-file scripts/fixtures/e2e.env.example -p "$PROJECT"
  -f docker-compose.yml -f compose.auth-test.yml -f docker-compose.e2e.yml --profile oidc --profile e2e)
assert_absent
mkdir -p "$STOCKPILOT_E2E_ARTIFACTS"
install_cleanup # Before build/up: handles partial start, build failure and signals.
compose build server client e2e
compose up -d --wait --wait-timeout 300 db oidc server client
compose run --rm --no-deps e2e node harness/readiness.mjs
if [[ "${1:-}" == --harness ]]; then
  compose run --rm --no-deps e2e npm run harness
else
  compose run --rm --no-deps e2e npm test
fi
