#!/usr/bin/env bash
# Session owns cleanup; restart/rebuild/status/stop must name that same reserved project explicitly.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/isolated-auth.sh"
isolated_init
[[ $# == 3 ]] || { echo 'Usage: dev-auth.sh nginx|vite stockpilot-dev-auth-<unique> session|restart|rebuild|status|stop' >&2; exit 2; }
MODE=$1 PROJECT=$2 ACTION=$3
validate_project "$PROJECT"
[[ "$PROJECT" == stockpilot-dev-auth-* ]] || exit 2
case "$MODE" in
  nginx) SERVICE=client; export APP_PUBLIC_URL=http://127.0.0.1:5175 ;;
  vite) SERVICE=client-dev; export APP_PUBLIC_URL=http://127.0.0.1:5176 ;;
  *) exit 2 ;;
esac
COMPOSE_ARGS=(compose --env-file scripts/fixtures/auth-test.env.example -p "$PROJECT"
  -f docker-compose.yml -f compose.auth-test.yml -f compose.dev-auth.yml --profile oidc --profile dev)
ready() { node scripts/probe-dev-auth.mjs "$MODE"; }
case "$ACTION" in
  session)
    assert_absent
    install_cleanup
    compose up -d --build --wait --wait-timeout 300 db oidc server "$SERVICE"
    ready
    echo "Dev auth ready: $PROJECT $MODE $APP_PUBLIC_URL. Close with Ctrl-C; only this project's data will be removed."
    # The project network survives restart/recreate. A running-container probe would
    # mistake the brief replacement gap for stop and delete a rebuilding stack.
    while [[ -n "$(resources network)" ]]; do sleep 1 & wait $!; done ;;
  restart|rebuild|status|stop)
    # Refuse an empty/foreign project and a mismatch of origin/mode before mutation.
    id="$(compose ps -q "$SERVICE")"
    [[ -n "$id" ]] || { echo 'No matching live session.' >&2; exit 2; }
    docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$id" |
      grep -Fxq "APP_PUBLIC_URL=$APP_PUBLIC_URL" || exit 2
    case "$ACTION" in
      restart) compose restart server "$SERVICE"; compose up -d --wait --wait-timeout 300 db oidc server "$SERVICE"; ready ;;
      rebuild) compose up -d --build --force-recreate --wait --wait-timeout 300 server "$SERVICE"; ready ;;
      status) compose ps; ready ;;
      stop) install_cleanup; exit 0 ;;
    esac ;;
  *) exit 2 ;;
esac
