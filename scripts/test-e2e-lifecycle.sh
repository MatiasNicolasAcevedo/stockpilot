#!/usr/bin/env bash
# Directed A infrastructure assays (plus C: verify.sh --e2e propagation/signal forwarding); real Docker Compose only.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export MSYS_NO_PATHCONV=1
export STOCKPILOT_A_DOCKER="$(command -v docker)"
task_temp="$(mktemp -d)"
trap 'rm -f "$task_temp/docker"; rmdir "$task_temp"' EXIT
cp scripts/fixtures/docker-e2e-fault.sh "$task_temp/docker"
chmod +x "$task_temp/docker"
export PATH="$task_temp:$PATH"
check_empty() {
  for kind in container network volume; do
    local flags=-q
    [[ "$kind" != container ]] || flags=-aq
    [[ -z "$("$STOCKPILOT_A_DOCKER" "$kind" ls "$flags" --filter "label=com.docker.compose.project=$STOCKPILOT_E2E_PROJECT")" ]] || {
      echo 'Residual resources after A assay' >&2; exit 1;
    }
  done
}
case "${1:-}" in
  '') scenarios=(success startup readiness signal startup-signal runner cleanup success-again verify-startup verify-signal) ;;
  --guards-only) scenarios=() ;;
  --startup-signal-only) scenarios=(startup-signal) ;;
  --runner-only) scenarios=(runner) ;;
  --verify-only) scenarios=(verify-startup verify-signal) ;;
  *) exit 2 ;;
esac
for scenario in "${scenarios[@]}"; do
  export STOCKPILOT_E2E_PROJECT="stockpilot-e2e-a-$scenario-$$"
  export STOCKPILOT_A_FAULT="$scenario"
  [[ "$scenario" != verify-startup ]] || export STOCKPILOT_A_FAULT=startup
  options=(--harness)
  [[ "$scenario" != runner ]] || options=(--runner-failure)
  log="${TMPDIR:-/tmp}/stockpilot-T003-A-$scenario.log"
  code=0
  if [[ "$scenario" == verify-signal ]]; then
    # C: TERM to the gate must reach e2e.sh (the cleanup owner), wait for its teardown and stop later suites.
    bash scripts/verify.sh --e2e > "$log" 2>&1 &
    task_pid=$!
    deadline=$((SECONDS + 300))
    until [[ -n "$("$STOCKPILOT_A_DOCKER" container ls -q --filter "label=com.docker.compose.project=$STOCKPILOT_E2E_PROJECT" --filter label=com.docker.compose.service=db)" ]]; do
      [[ "$SECONDS" -lt "$deadline" ]] && kill -0 "$task_pid" || exit 1
      sleep 0.2
    done
    kill -TERM "$task_pid"
    wait "$task_pid" || code=$?
    grep -q 'e2e     INTERRUMPIDA (señal; exit 143 tras su cleanup)' "$log"
  elif [[ "$scenario" == verify-startup ]]; then
    # C: a real startup failure inside the gate's E2E suite is reported per suite and fails the gate.
    bash scripts/verify.sh --e2e > "$log" 2>&1 || code=$?
    grep -q 'e2e     FALLÓ (exit 1)' "$log"
  elif [[ "$scenario" == startup-signal ]]; then
    bash scripts/e2e.sh --harness > "$log" 2>&1 &
    task_pid=$!
    deadline=$((SECONDS + 90))
    until [[ -n "$("$STOCKPILOT_A_DOCKER" container ls -q --filter "label=com.docker.compose.project=$STOCKPILOT_E2E_PROJECT" --filter label=com.docker.compose.service=db)" ]]; do
      [[ "$SECONDS" -lt "$deadline" ]] && kill -0 "$task_pid" || exit 1
      sleep 0.2
    done
    kill -TERM "$task_pid"
    wait "$task_pid" || code=$?
  else
    bash scripts/e2e.sh "${options[@]}" > "$log" 2>&1 || code=$?
  fi
  case "$scenario" in
    success|success-again) [[ "$code" == 0 ]] ;;
    signal|startup-signal|verify-signal) [[ "$code" == 143 ]] ;;
    runner) [[ "$code" == 42 ]] ;;
    startup|verify-startup)
      # Only the injected server exit 42 counts; a missing overlay or any other startup error must not pass.
      [[ "$code" != 0 ]]
      grep -Fq 'server-1 exited (42)' "$log"
      [[ "$scenario" != verify-startup || "$code" == 1 ]] ;;
    readiness)
      [[ "$code" != 0 ]]
      grep -Fq 'readiness deadline exceeded' "$log" ;;
    cleanup)
      [[ "$code" != 0 ]]
      grep -Fq 'Cleanup failed for isolated project.' "$log" ;;
    *) exit 1 ;;
  esac
  check_empty
  echo "A: $scenario exit=$code; zero own containers/networks/volumes"
done
export STOCKPILOT_A_FAULT=''
for invalid in stockpilot stockpilot-dev-auth-not-e2e 'stockpilot-e2e-../unsafe'; do
  export STOCKPILOT_E2E_PROJECT="$invalid"
  code=0
  bash scripts/e2e.sh --harness > /dev/null 2>&1 || code=$?
  [[ "$code" == 2 ]]
done
echo 'A: ordinary/wrong namespace/path project inputs rejected before mutation'
export STOCKPILOT_E2E_PROJECT="stockpilot-e2e-a-protected-$$"
sentinel="${STOCKPILOT_E2E_PROJECT}_sentinel"
"$STOCKPILOT_A_DOCKER" volume create --label "com.docker.compose.project=$STOCKPILOT_E2E_PROJECT" "$sentinel" > /dev/null
code=0
bash scripts/e2e.sh --harness > /dev/null 2>&1 || code=$?
[[ "$code" == 2 ]]
"$STOCKPILOT_A_DOCKER" volume inspect "$sentinel" > /dev/null
"$STOCKPILOT_A_DOCKER" volume rm "$sentinel" > /dev/null
check_empty
echo 'A: preexisting project rejected; protected sentinel left intact before its explicit teardown'
