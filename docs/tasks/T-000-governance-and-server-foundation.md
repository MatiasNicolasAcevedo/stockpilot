---
id: T-000
status: in_progress
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
role: implementer
executor: frontier
pr: null
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
| T0-03 | Repo público, solo squash, borrado de ramas, secret scanning y push protection, ruleset sin bypass | `gh api repos/MatiasNicolasAcevedo/stockpilot` y ruleset `main-protection` (id 24964732) | Verificado; `verify-required` requerido pendiente de su primer reporte |
| T0-04 | Backend: Spotless, unitarios/slices, integración Testcontainers y JaCoCo en el runner containerizado | `docker compose --profile verify run --rm server-tests` → `BUILD SUCCESS`, 3 + 7 tests | Verificado 2026-10-12 (árbol de trabajo de T-000 sobre base `2d06bbb`) |
| T0-05 | Flyway desde DB vacía + Hibernate `validate` + PostgreSQL 18.x | `ServerApplicationIT` (historial Flyway V1, `server_version_num` 18xxxx) | Verificado |
| T0-06 | Identidad estable `(issuer, subject)` única; mismo `subject` de otro issuer es otra identidad | `AppUserRepositoryIT` | Verificado |
| T0-07 | Sin sesión: `/api/**` → 401 ProblemDetail; POST sin CSRF → 403 ProblemDetail; sin form/Basic | `SecurityConfigTest`; `curl` contra el stack: 401 JSON | Verificado |
| T0-08 | `docker compose up -d --build --wait` levanta db/server healthy; reinicio, `down`/`up` y rebuild conservan datos de desarrollo | `flyway_schema_history.installed_on` idéntico tras restart, down/up y rebuild | Verificado 2026-10-12 |
| T0-09 | docs-check verde y gate BOOTSTRAP local; fallos propagan exit ≠ 0 | `bash scripts/verify.sh` → docs OK, server OK (BUILD SUCCESS 3 + 7); `--client` → exit 1, opción inválida → exit 2; docs-check detecta 11 mutaciones controladas | Verificado 2026-10-12 |
| T0-10 | CI: `verify-required` reporta BOOTSTRAP verde en el PR y queda como check requerido | Run del PR + ruleset actualizado | pendiente |

Política de gate: BOOTSTRAP (docs + backend). FULL no existe todavía (T-003).

## Checkpoint de implementación
- Sesiones: implementación · Opus 5.5 (`claude-opus-5-5`) · Claude Code (extensión VS Code) · esfuerzo configurado `xhigh` en los settings del usuario (el contrato pide high; no es un modelo menor).
- Hecho: herramientas del paso 0 comprobadas (todas presentes); inventario de scaffolds; Git + exclusión + ancla; repo y ruleset; código, pruebas y Compose del server; documentación de gobierno.
- Pendiente: gate local completo, PR draft, CI, `verify-required` requerido, paso a `in_review`.
- Decisiones y supuestos: ADR 0001; la alternativa preaprobada de host para Testcontainers **no** se aplicó porque el runner containerizado funcionó en la primera configuración.
- Archivos propios y cambios heredados: scaffolds del dueño anclados sin cambios en `2d06bbb`; todo lo demás es de esta tarea.
- Pruebas: ver tabla; comandos ejecutados el 2026-10-12.
- Bloqueos: ninguno.
- Rama / PR: `chore/T-000-governance-and-server-foundation` / pendiente.
- Último commit conocido: `2d06bbb` (base).
- Publicación: local.
- Próximo comando o acción: `bash scripts/verify.sh`, commit de rutas explícitas, push y PR draft.

## Resultado
Pendiente.
