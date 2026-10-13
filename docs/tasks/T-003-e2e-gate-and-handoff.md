---
id: T-003
status: draft
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: [T-002]
branch: ci/T-003-e2e-gate-and-handoff
risk: elevated
role: planner
executor: frontier
pr: null
---
# T-003 · E2E, gate FULL, CI requerida y traspaso

**Borrador:** se refina al tomarla. Resultados esperados:

- `e2e/` con `@playwright/test` fijado y lockfile; imagen Playwright de la misma versión exacta; `docker-compose.e2e.yml` con proyecto Compose único por ejecución, DB y volumen efímeros, build real del client, API propia y proveedor OIDC local; `scripts/e2e.sh` con espera de health, datos ficticios idempotentes y cleanup en `trap`, también si falla el arranque.
- Pruebas Chromium desktop (1280 px) y móvil (375 px): visitante anónimo, login OIDC local, sesión tras recarga, error de API visible, logout; `forbidOnly`, sin retries en el gate, trace/screenshot en fallos, reportes HTML/JUnit como artefactos solo en fallos.
- `GATE_PHASE=FULL` en `verify.sh` y `ci.yml`; job E2E en paralelo con `timeout-minutes`; `verify-required` exige docs/server/client/e2e. Gate FULL real ejecutado en local y en CI.
- Spec del primer flujo de M1 (`docs/specs/S-002-…`, ciclo C1 propuesto en ROADMAP) y primera tarea de Junie Lite (T-004) refinada hasta `ready` condicionada al cierre de M0.
- HANDOFF con los 21 criterios y evidencia, veredicto, modalidades de continuidad/merge, pendientes externos y prompt completo de recepción; cierre según el procedimiento sin bucle documental (PENDIENTE_MERGE_M0 hasta confirmar el merge).
