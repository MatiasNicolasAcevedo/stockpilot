#!/usr/bin/env bash
# Gate local de StockPilot (docs/TESTING.md). Ejecutar con Bash (Git Bash/WSL) desde cualquier carpeta del repo.
# Despacha contenedores con Docker Compose; devuelve exit code distinto de cero si falla cualquier suite.
#   bash scripts/verify.sh            todas las suites de la fase actual (FULL: único gate de entrega)
#   bash scripts/verify.sh --docs     solo docs-check (gate de entrega solo si --policy informa DOCS_ONLY)
#   bash scripts/verify.sh --server   solo backend (runner server-tests o alternativa host)
#   bash scripts/verify.sh --client   solo client (runner client-tests: typecheck, lint, formato, tests, build)
#   bash scripts/verify.sh --e2e      solo E2E Playwright real (scripts/e2e.sh: stack aislado, Node 24 en el host)
#   bash scripts/verify.sh --fast     fase actual sin E2E (solo iteración; nunca habilita revisión ni merge)
#   bash scripts/verify.sh --policy <base>   muestra la política del diff contra <base> sin ejecutar suites
set -uo pipefail

# Fase del gate: FULL desde T-003 C (BOOTSTRAP fue la fase de T-000..T-002). Debe coincidir con ci.yml (docs-check).
GATE_PHASE="FULL"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2

phase_suites() {
  case "$GATE_PHASE" in
    BOOTSTRAP) echo "docs server client" ;;
    FULL) echo "docs server client e2e" ;;
    *) echo "verify.sh: fase desconocida $GATE_PHASE" >&2; exit 2 ;;
  esac
}

server_mode() {
  local mode="${STOCKPILOT_SERVER_TESTS:-}"
  if [[ -z "$mode" && -f .env ]]; then
    mode="$(sed -n 's/^STOCKPILOT_SERVER_TESTS=//p' .env | tail -n 1 | tr -d '\r')"
  fi
  echo "${mode:-container}"
}

# Cada suite corre en un subshell en segundo plano y hace exec del proceso real: la señal reenviada llega a quien
# posee su limpieza (e2e.sh retira solo su proyecto) y no a un subshell intermedio.
suite_docs() {
  exec docker compose --profile verify run --rm docs-check
}

suite_server() {
  local mode
  mode="$(server_mode)"
  echo "verify.sh: backend en modo '$mode'"
  case "$mode" in
    container) exec docker compose --profile verify run --rm server-tests ;;
    host) cd server && exec ./mvnw -B -ntp clean verify ;;
    *) echo "verify.sh: STOCKPILOT_SERVER_TESTS inválido: $mode (container|host)" >&2; exit 2 ;;
  esac
}

# La imagen verify copia las fuentes actuales; --build la reconstruye (npm ci queda en caché si el lockfile no cambió).
suite_client() {
  exec docker compose --profile verify run --build --rm client-tests
}

# Proyecto Compose único y propio, env-file ficticio, sin puertos host; exporta solo reportes saneados y auditados.
suite_e2e() {
  exec bash scripts/e2e.sh
}

# INT/TERM/HUP: reenviar TERM a la suite en curso, esperar a que termine su cleanup y no iniciar las siguientes.
# Se reenvía TERM porque los hijos en segundo plano de un shell no interactivo heredan SIGINT ignorado.
CHILD=''
SIGNAL_CODE=0
forward_signal() {
  SIGNAL_CODE=$1
  [[ -z "$CHILD" ]] || kill -TERM "$CHILD" 2>/dev/null || true
}
trap 'forward_signal 130' INT
trap 'forward_signal 143' TERM
trap 'forward_signal 129' HUP

run_suite() {
  local code=0
  "suite_$1" &
  CHILD=$!
  while true; do
    code=0
    wait "$CHILD" || code=$?
    # wait vuelve antes de tiempo cuando llega una señal atrapada; seguir esperando hasta que el hijo termine.
    kill -0 "$CHILD" 2>/dev/null || break
  done
  CHILD=''
  return "$code"
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
  if [[ "$SIGNAL_CODE" != 0 ]]; then
    result[$suite]="NO EJECUTADA (interrumpido)"
    continue
  fi
  echo "==> suite $suite"
  code=0
  run_suite "$suite" || code=$?
  if [[ "$SIGNAL_CODE" != 0 ]]; then
    result[$suite]="INTERRUMPIDA (señal; exit $code tras su cleanup)"
    overall=1
  elif [[ $code -eq 0 ]]; then
    result[$suite]="OK"
  else
    result[$suite]="FALLÓ (exit $code)"
    overall=1
  fi
done

echo
echo "Resumen verify.sh · fase $GATE_PHASE${1:+ · $1}"
for suite in "${suites[@]}"; do printf '  %-7s %s\n' "$suite" "${result[$suite]}"; done
if [[ "$GATE_PHASE" != FULL ]]; then
  echo "  Nota: $GATE_PHASE no es el gate completo; el cierre de M0 exige FULL."
elif [[ -n "${1:-}" ]]; then
  echo "  Nota: ejecución parcial (${1}); no habilita ready, revisión ni merge. El gate de entrega es FULL sin opciones (o --docs solo si --policy informa DOCS_ONLY)."
fi
if [[ "$SIGNAL_CODE" != 0 ]]; then
  exit "$SIGNAL_CODE"
fi
exit $overall
