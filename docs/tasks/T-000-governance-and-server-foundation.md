---
id: T-000
status: done
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: []
branch: chore/T-000-governance-and-server-foundation
risk: elevated
role: merger
executor: frontier
pr: 1
---
# T-000 · Gobierno del repositorio y base server con PostgreSQL/Flyway

## Objetivo y evidencia
Dejar el repositorio gobernable y la base backend verificable: Git único con el kit excluido, repo público con licencia y protecciones, documentación operativa autosuficiente (AGENTS/CLAUDE, docs, protocolos, HANDOFF con 21 criterios), CI con `verify-required` en BOOTSTRAP, y un backend que arranca en Compose contra PostgreSQL 18.6 con Flyway, valida el esquema y prueba la integración con Testcontainers desde un runner containerizado.

## Alcance
Incluye: inventario de herramientas y scaffolds; revisión de PROJECT_CONTEXT (v1.1); commit de anclaje; repo GitHub, ajustes de merge, ruleset inicial y `verify-required` requerido; documentación de gobierno; POM alineado a Java 21 con Spotless, Failsafe, JaCoCo y agente Mockito; `application.yaml`; migración V1 e identidad local (entidad/repositorio); seguridad deny-by-default con 401/403 ProblemDetail; Dockerfile del server; Compose `db` + `server` + runners `server-tests`/`docs-check`; `scripts/verify.sh`, `scripts/docs-check.mjs`, clasificador de diff; workflow de CI.
No incluye: client (T-001), login OIDC/sesión/CSRF para la SPA (T-002), E2E y gate FULL (T-003), funcionalidades de negocio (M1+).

## Impacto
- Comportamiento: el server deja de exponer endpoints sin autenticación salvo health; no hay funcionalidad de negocio todavía.
- Contratos: 401/403 como `application/problem+json`. Esquema inicial `app_user (issuer, subject)` único.
- Permisos/datos: identidad local sin roles globales; volumen de desarrollo separado de las DB de pruebas.
- Scaffold: Java 25 → 21 (decisión confirmada del contexto), springdoc 3.1.0 → 3.1.1, `postgres:latest` → `postgres:18.6`, test generado `ServerApplicationTests` reemplazado por `ServerApplicationIT`. Ver [ADR 0001](../adr/0001-base-tecnica-y-alineacion-del-scaffold.md).

## Leer antes
[PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) §3, §6, §9 · [ARCHITECTURE.md](../ARCHITECTURE.md) · [TESTING.md](../TESTING.md) · [AUTONOMY.md](../AUTONOMY.md).

## Aceptación y pruebas
| ID | Criterio | Comando / evidencia | Resultado real |
|---|---|---|---|
| T0-01 | Un solo Git en la raíz; `plantilla/` excluido localmente y fuera del índice | `git check-ignore -v -- plantilla/PROJECT_TEMPLATE.md plantilla/PROJECT_WORKFLOW.md plantilla/PROJECT_CONTEXT.md` → regla `.git/info/exclude:9:/plantilla/`; `git ls-files -- plantilla` → 0 | Verificado 2026-10-12 |
| T0-02 | Ancla en `main` con scaffolds, contexto e ignores, sin kit ni secretos | Commit `2d06bbb` (33 archivos revisados) publicado en `origin/main` | Verificado |
| T0-03 | Repo público, solo squash, borrado de ramas, secret scanning y push protection, ruleset sin bypass | `gh api repos/MatiasNicolasAcevedo/stockpilot` y ruleset `main-protection` (id 24964732) | Verificado; `verify-required` agregado como requerido (integración GitHub Actions 15368, rama actualizada) tras reportar en el PR #1 |
| T0-04 | Backend: Spotless, unitarios/slices, integración Testcontainers y JaCoCo en el runner containerizado | `docker compose --profile verify run --rm server-tests` → `BUILD SUCCESS`, 3 + 7 tests | Verificado 2026-10-12 (árbol de trabajo de T-000 sobre base `2d06bbb`) |
| T0-05 | Flyway desde DB vacía + Hibernate `validate` + PostgreSQL 18.x | `ServerApplicationIT` (historial Flyway V1, `server_version_num` 18xxxx) | Verificado |
| T0-06 | Identidad estable `(issuer, subject)` única; mismo `subject` de otro issuer es otra identidad | `AppUserRepositoryIT` | Verificado |
| T0-07 | Sin sesión: `/api/**` → 401 ProblemDetail; POST sin CSRF → 403 ProblemDetail; sin form/Basic | `SecurityConfigTest`; `curl` contra el stack: 401 JSON | Verificado |
| T0-08 | `docker compose up -d --build --wait` levanta db/server healthy; reinicio, `down`/`up` y rebuild conservan datos de desarrollo | `flyway_schema_history.installed_on` idéntico tras restart, down/up y rebuild | Verificado 2026-10-12 |
| T0-09 | docs-check verde y gate BOOTSTRAP local; fallos propagan exit ≠ 0 | `bash scripts/verify.sh` → docs OK, server OK (BUILD SUCCESS 3 + 7); `--client` → exit 1, opción inválida → exit 2; docs-check detecta 11 mutaciones controladas | Verificado 2026-10-12 |
| T0-10 | CI: `verify-required` reporta BOOTSTRAP verde en el PR y queda como check requerido | Ruleset con `verify-required` requerido; run draft 38337479833 sobre `1e70271`: classify BOOTSTRAP, docs-check y server verdes en checkout limpio sin `plantilla/`, `verify-required` falla a propósito por DRAFT. Los runs de `18f293b` mostraron la carrera TR-07 (el DRAFT de `synchronize` canceló al de `ready_for_review`); corregida leyendo el estado draft vigente. El run completo sobre el HEAD final se registra en el comentario de evidencia del PR #1 | Verificado por la revisión: run 38337986915 (`pull_request`, PR ready) sobre `4ae508b` y base `2d06bbb`: classify BOOTSTRAP, docs-check, server `clean verify` (7 IT) y `verify-required` verdes |

Política de gate: BOOTSTRAP (docs + backend). FULL no existe todavía (T-003).

## Checkpoint de implementación
- Sesiones: implementación · Opus 5.5 (`claude-opus-5-5`) · Claude Code (extensión VS Code) · esfuerzo configurado `xhigh` en los settings del usuario (el contrato pide high; no es un modelo menor).
- Hecho: herramientas del paso 0 comprobadas (todas presentes); inventario de scaffolds; Git + exclusión + ancla; repo y ruleset; código, pruebas y Compose del server; documentación de gobierno.
- Pendiente: revisión en sesión distinta (recomendado GPT-6.1 Sol / Codex) y merge elegible. El primer run de CI falló en `actions/setup-java` por el formato de versión (TR-06); corregido en `1e70271`.
- Decisiones y supuestos: ADR 0001; la alternativa preaprobada de host para Testcontainers **no** se aplicó porque el runner containerizado funcionó en la primera configuración.
- Archivos propios y cambios heredados: scaffolds del dueño anclados sin cambios en `2d06bbb`; todo lo demás es de esta tarea.
- Pruebas: ver tabla; comandos ejecutados el 2026-10-12.
- Bloqueos: ninguno.
- Rama / PR: `chore/T-000-governance-and-server-foundation` / [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) (ready al publicar este commit).
- Último commit conocido: `18f293b` (transición a revisión); la corrección de TR-07 cambia el HEAD y su SHA queda en el comentario de evidencia del PR.
- Publicación: publicada en el PR #1.
- Próximo comando o acción: sesión revisora con el prompt de docs/STATUS.md.

## Checkpoint de revisión
- Sesión: revisión → merger · Opus 5.5 (`claude-opus-5-5`) · Claude Code (extensión VS Code) · sesión nueva, distinta de la implementación (Opus 5.5 / Claude Code). Se recomendaba GPT-6.1 Sol / Codex; el dueño abrió la revisión con Opus 5.5 en otra sesión, lo que AUTONOMY admite (la independencia exigida es de sesión).
- SHA revisado: HEAD `4ae508b18a031db3c4567e918b43babe114497fa` sobre base `main` = `2d06bbb2b49fb50f826ee9204beca7efa4781efb`; workspace limpio en ese SHA, `plantilla/` excluida y fuera del índice.
- Diff completo revisado contra `main` (56 archivos): PROJECT_CONTEXT v1.1 y §12, gobierno, POM Java 21, seguridad deny-by-default, V1, Compose, Dockerfile, `verify.sh`, `docs-check.mjs`, `classify-diff.mjs`, `ci.yml`.
- Pruebas reales (2026-10-12): `bash scripts/verify.sh` → exit 0 (docs-check OK, 34 Markdown, HANDOFF 3/21; server BUILD SUCCESS 3 + 7 con `postgres:18.6`). `docker compose up -d --build --wait` → db/server healthy; `curl` anónimo: `/actuator/health` 200 UP, `GET /api/v1/stores` 401 `application/problem+json`, `POST` sin CSRF 403 `application/problem+json`, `/login` y `/actuator/env` 401; PostgreSQL 18.6; `flyway_schema_history.installed_on` idéntico tras rebuild, restart y down/up. Repo y ruleset 24964732 consultados con `gh api`: coinciden con T0-03.
- T0-01…T0-10: verificados. HANDOFF, STATUS y BACKLOG no declaran más de lo comprobado (C-01, B-02 y G-01 verificados; resto pendiente).
- Observaciones no bloqueantes: (1) GitHub aún no detecta la licencia porque `LICENSE` llega a `main` con este merge; la reconciliación confirma `license.spdx_id = MIT`. (2) La allowlist DOCS_ONLY acepta cualquier `*.md`, también bajo `server/src` o `client/src`; riesgo bajo, anotado en BACKLOG. (3) TR-04 se observa en el merge.
- Veredicto: `APROBADO`, publicado en el PR #1 con SHA de HEAD final y base.

## Resultado
**Done.** PR #1 squash-mergeado el 2026-10-13T02:52:20Z (UTC) con `--match-head-commit` sobre el HEAD aprobado `bc1667c`; commit de merge `9f061f55f99e614e36f8317150881ed9408a8c96` en `main` (padre `2d06bbb`), rama borrada. CI de `main` sobre `9f061f5`: [run 38338964430](https://github.com/MatiasNicolasAcevedo/stockpilot/actions/runs/38338964430) (classify, docs-check, server y `verify-required` verdes). GitHub detecta `license.spdx_id = MIT`. TR-04 no bloqueó el merge. Reconciliado con `gh` el 2026-10-13 por la sesión implementer de T-001.

Criterios T0-01…T0-10 cumplidos. Descubrimientos: TR-01 (zona horaria del JVM), TR-04 (parámetro por defecto del ruleset), TR-06 (formato de versión en setup-java) y TR-07 (carrera draft/ready en CI, corregida en `ci.yml`), documentados en SETUP; allowlist DOCS_ONLY anotada en BACKLOG.
