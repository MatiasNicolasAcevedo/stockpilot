#!/usr/bin/env bash
# Test-only Docker CLI adapter: delegates to the real engine, never simulates a successful operation.
set -euo pipefail
args=("$@")
case "${STOCKPILOT_A_FAULT:-}" in
  startup)
    # Relative to the repo root (e2e.sh's cwd): an MSYS absolute path is not a valid docker.exe path on Windows.
    for i in "${!args[@]}"; do
      if [[ "${args[$i]}" == up ]]; then
        args=("${args[@]:0:$i}" -f scripts/fixtures/compose.e2e-startup-failure.yml "${args[@]:$i}")
        break
      fi
    done ;;
  readiness|signal)
    if [[ " $* " == *' node harness/readiness.mjs '* ]]; then
      if [[ "$STOCKPILOT_A_FAULT" == signal ]]; then
        kill -TERM "$PPID"
        exit 143
      fi
      for i in "${!args[@]}"; do
        if [[ "${args[$i]}" == run ]]; then
          "$STOCKPILOT_A_DOCKER" "${args[@]:0:$i}" stop server
          break
        fi
      done
    fi ;;
  cleanup)
    if [[ " $* " == *' down '* ]]; then
      "$STOCKPILOT_A_DOCKER" "${args[@]}"
      exit 29 # Real removal succeeded, but cleanup's exit must still reject green.
    fi ;;
esac
exec "$STOCKPILOT_A_DOCKER" "${args[@]}"
