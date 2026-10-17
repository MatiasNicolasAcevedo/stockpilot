#!/usr/bin/env bash
# Shared lifecycle only; fixed versioned fictitious inputs and explicit Compose files.
isolated_init() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." || return 2
  ROOT="$(pwd)"
  export MSYS_NO_PATHCONV=1
  unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_ENV_FILES COMPOSE_PROJECT_NAME
  export POSTGRES_DB=stockpilot_auth_test POSTGRES_USER=stockpilot_auth_test
  export POSTGRES_PASSWORD=fictitious-auth-test-only LOCAL_OIDC_PORT=8090
  export GOOGLE_CLIENT_ID='' GOOGLE_CLIENT_SECRET='' CLIENT_PORT=5175 CLIENT_DEV_PORT=5176
  export STOCKPILOT_SERVER_TESTS=container
}
validate_project() {
  [[ "$1" =~ ^stockpilot-(e2e|dev-auth)-[a-z0-9][a-z0-9-]{0,47}$ ]] || {
    echo 'Invalid isolated project; ordinary stockpilot is forbidden.' >&2; return 2;
  }
}
compose() {
  docker "${COMPOSE_ARGS[@]}" "$@" &
  COMPOSE_PID=$!
  local code=0
  wait "$COMPOSE_PID" || code=$?
  COMPOSE_PID=''
  return "$code"
}
on_signal() {
  # Finish the CLI before down, so it cannot create more services during cleanup.
  if [[ -n "${COMPOSE_PID:-}" ]]; then
    kill -TERM "$COMPOSE_PID" 2>/dev/null || true
    wait "$COMPOSE_PID" 2>/dev/null || true
    COMPOSE_PID=''
  fi
  exit "$1"
}
resources() {
  if [[ "$1" == container ]]; then
    docker container ls -aq --filter "label=com.docker.compose.project=$PROJECT"
  else
    docker "$1" ls -q --filter "label=com.docker.compose.project=$PROJECT"
  fi
}
cleanup() {
  local original=$? failed=0
  trap - EXIT INT TERM HUP
  compose down --volumes --remove-orphans --timeout 10 || failed=1
  # A failed removal or residual container/network/volume prevents green.
  for kind in container network volume; do
    local remaining
    remaining="$(resources "$kind")" || failed=1
    [[ -z "$remaining" ]] || failed=1
  done
  [[ "$failed" == 0 ]] || { echo 'Cleanup failed for isolated project.' >&2; [[ "$original" != 0 ]] || original=1; }
  exit "$original"
}
install_cleanup() {
  trap cleanup EXIT
  trap 'on_signal 130' INT
  trap 'on_signal 143' TERM
  trap 'on_signal 129' HUP
}
assert_absent() {
  local kind resources
  for kind in container network volume; do
    resources="$(resources "$kind")" || return 1
    [[ -z "$resources" ]] || { echo 'Project already has resources; choose a new project.' >&2; return 2; }
  done
}
