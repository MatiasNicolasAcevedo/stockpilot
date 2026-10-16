#!/usr/bin/env bash
# Directed A infrastructure assays only; all stack calls are real Docker Compose.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export MSYS_NO_PATHCONV=1
export STOCKPILOT_A_ROOT="$(pwd)"
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
  '') scenarios=(success startup readiness signal startup-signal runner cleanup success-again) ;;
  --guards-only) scenarios=() ;;
  --startup-signal-only) scenarios=(startup-signal) ;;
  --runner-only) scenarios=(runner) ;;
  *) exit 2 ;;
esac
for scenario in "${scenarios[@]}"; do
  export STOCKPILOT_E2E_PROJECT="stockpilot-e2e-a-$scenario-$$"
  export STOCKPILOT_A_FAULT="$scenario"
  options=(--harness)
  [[ "$scenario" != runner ]] || options=(--runner-failure)
  code=0
  if [[ "$scenario" == startup-signal ]]; then
    bash scripts/e2e.sh --harness > "${TMPDIR:-/tmp}/stockpilot-T003-A-$scenario.log" 2>&1 &
    task_pid=$!
    deadline=$((SECONDS + 90))
    until [[ -n "$("$STOCKPILOT_A_DOCKER" container ls -q --filter "label=com.docker.compose.project=$STOCKPILOT_E2E_PROJECT" --filter label=com.docker.compose.service=db)" ]]; do
      [[ "$SECONDS" -lt "$deadline" ]] && kill -0 "$task_pid" || exit 1
      sleep 0.2
    done
    kill -TERM "$task_pid"
    wait "$task_pid" || code=$?
  else
    bash scripts/e2e.sh "${options[@]}" > "${TMPDIR:-/tmp}/stockpilot-T003-A-$scenario.log" 2>&1 || code=$?
  fi
  case "$scenario" in
    success|success-again) [[ "$code" == 0 ]] ;;
    signal|startup-signal) [[ "$code" == 143 ]] ;;
    runner) [[ "$code" == 42 ]] ;;
    *) [[ "$code" != 0 ]] ;;
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
