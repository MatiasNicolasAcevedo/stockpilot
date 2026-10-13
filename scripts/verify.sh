#!/usr/bin/env bash
# Gate local de StockPilot (docs/TESTING.md). Ejecutar con Bash (Git Bash/WSL) desde cualquier carpeta del repo.
# Despacha contenedores con Docker Compose; devuelve exit code distinto de cero si falla cualquier suite.
#   bash scripts/verify.sh            todas las suites de la fase actual
#   bash scripts/verify.sh --docs     solo docs-check
#   bash scripts/verify.sh --server   solo backend (runner server-tests o alternativa host)
#   bash scripts/verify.sh --client   solo client (runner client-tests: typecheck, lint, formato, tests, build)
#   bash scripts/verify.sh --fast     fase actual sin E2E (solo iteración; nunca autoriza merge)
#   bash scripts/verify.sh --policy <base>   muestra la política del diff contra <base> sin ejecutar suites
set -uo pipefail

# Fase del gate: BOOTSTRAP durante M0 (T-000..T-002); FULL desde T-003. Debe coincidir con ci.yml (docs-check).
GATE_PHASE="BOOTSTRAP"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2

phase_suites() {
  case "$GATE_PHASE" in
    BOOTSTRAP) echo "docs server client" ;;
    FULL) echo "docs server client e2e" ;;
    *) echo "verify.sh: fase desconocida $GATE_PHASE" >&2; exit 2 ;;
  esac
}

materialized() {
  case "$1" in
    docs|server|client) return 0 ;;
    *) return 1 ;;
  esac
}

server_mode() {
  local mode="${STOCKPILOT_SERVER_TESTS:-}"
  if [[ -z "$mode" && -f .env ]]; then
    mode="$(sed -n 's/^STOCKPILOT_SERVER_TESTS=//p' .env | tail -n 1 | tr -d '\r')"
  fi
  echo "${mode:-container}"
}

run_docs() {
  docker compose --profile verify run --rm docs-check
}

run_server() {
  local mode
  mode="$(server_mode)"
  echo "verify.sh: backend en modo '$mode'"
  case "$mode" in
    container) docker compose --profile verify run --rm server-tests ;;
    host) (cd server && ./mvnw -B -ntp clean verify) ;;
    *) echo "verify.sh: STOCKPILOT_SERVER_TESTS inválido: $mode (container|host)" >&2; return 2 ;;
  esac
}

# La imagen verify copia las fuentes actuales; --build la reconstruye (npm ci queda en caché si el lockfile no cambió).
run_client() {
  docker compose --profile verify run --build --rm client-tests
}

suites=()
case "${1:-}" in
  "") read -r -a suites <<< "$(phase_suites)" ;;
  --fast) read -r -a all <<< "$(phase_suites)"; for s in "${all[@]}"; do [[ "$s" != e2e ]] && suites+=("$s"); done ;;
  --docs) suites=(docs) ;;
  --server) suites=(server) ;;
  --client) suites=(client) ;;
  --e2e) suites=(e2e) ;;
  --policy)
    base="${2:-origin/main}"
    node scripts/ci/classify-diff.mjs --base "$base" --head HEAD --phase "$GATE_PHASE"
    exit $? ;;
  -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
  *) echo "verify.sh: opción desconocida $1" >&2; exit 2 ;;
esac

declare -A result
overall=0
for suite in "${suites[@]}"; do
  if ! materialized "$suite"; then
    echo "verify.sh: la suite '$suite' no está materializada todavía (ver docs/TESTING.md)" >&2
    result[$suite]="NO MATERIALIZADA"
    overall=1
    continue
  fi
  echo "==> suite $suite"
  "run_$suite"
  code=$?
  if [[ $code -eq 0 ]]; then result[$suite]="OK"; else result[$suite]="FALLÓ (exit $code)"; overall=1; fi
done

echo
echo "Resumen verify.sh · fase $GATE_PHASE${1:+ · $1}"
for suite in "${suites[@]}"; do printf '  %-7s %s\n' "$suite" "${result[$suite]}"; done
if [[ "$GATE_PHASE" != FULL ]]; then
  echo "  Nota: $GATE_PHASE no es el gate completo; el cierre de M0 exige FULL."
fi
exit $overall
