# HANDOFF · Preparación para Junie Lite

Registro del traspaso de la fase A (frontera) a la fase B (Junie Lite). Creado al iniciar M0 (T-000, 2026-10-12) y actualizado por cada tarea de preparación. **Documentación lista y ejecución lista son estados distintos:** un criterio se marca `verificado` solo con evidencia real (comando/run, resultado, fecha, alcance o commit; documento y acuerdo; consulta a GitHub).

## Veredicto vigente
- **Veredicto:** `NO_LISTO` — M0 en curso; falta client, autenticación, E2E/gate FULL y cierre.
- **Contexto usado:** PROJECT_CONTEXT.md v1.1 (2026-10-12).
- **Continuidad:** `POR_SESION` — el dueño abre cada sesión con el prompt de [STATUS.md](STATUS.md#prompt-de-la-siguiente-sesión). No hay dispatcher instalado ni probado.
- **Merge:** `AUTOMATICO_ELEGIBLE` preparado, no comprobado todavía: requiere `verify-required` como check requerido y el primer merge confirmado (G-02).
- **Primera tarea de Junie Lite:** se define en T-003 (spec del primer flujo y T-004).

## Checklist de 21 criterios
| ID | Criterio del producto | Estado | Evidencia comprobada | Pendiente / responsable / siguiente acción |
|---|---|---|---|---|
| C-01 | Idea aceptada: PROJECT_CONTEXT identifica problema, usuario, MVP/exclusiones y flujo central (F-03); sin decisiones de producto bloqueantes para la primera entrega | verificado | Revisión de T-000 (2026-10-12): contexto v1.1 con §12; MVP aceptado por el dueño; §11 sin bloqueantes; P-11 resuelto por el dueño en la sesión | — |
| C-02 | Spec del primer flujo con datos/reglas, permisos/propiedad, estados de UI y aceptación de éxito, validación/error y denegación | pendiente | — | T-003: spec S-002 del ciclo C1 propuesto en ROADMAP |
| C-03 | Arquitectura, contratos API/datos y versiones reales compatibles registrados; auth, persistencia y estructura no quedan para Junie | pendiente | Parcial: [ARCHITECTURE.md](ARCHITECTURE.md), [ADR 0001](adr/0001-base-tecnica-y-alineacion-del-scaffold.md), versiones en [SETUP.md](SETUP.md) | T-002 (ADR de sesión/CSRF, contrato auth) y T-003 (contratos del primer flujo) |
| E-01 | Raíz correcta en la herramienta de frontera; modelo/herramienta registrados por sesión; herramientas del paso 0 comprobadas; disponibilidad de Junie Lite en AIR conocida | pendiente | Raíz `stockpilot/` abierta en Claude Code con Opus 5.5 (T-000); Docker 28.5.1/Compose 2.40.2, Git 2.51.1/Bash 5.2.37, gh 2.96.0 autenticado, Node 24.21.0, JDK 21.0.9 comprobados el 2026-10-12 | Dueño: confirmar que Junie Lite aparece disponible en AIR con esta raíz abierta (no observado por frontera) |
| E-02 | Wrappers, lockfiles, imágenes y herramientas inventariados; SETUP explica el camino PowerShell/Bash elegido; comandos de instalar/levantar/probar/detener/retomar ejecutados | pendiente | Backend y Compose ejecutados (T-000): `up --build --wait`, restart, down/up, `server-tests` | T-001/T-003: comandos del client y E2E |
| E-03 | Ejemplos de entorno sin secretos, puertos/URLs documentados; faltantes externos con responsable; configuración real fuera de Git y builds | pendiente | `.env.example` con valores ficticios; `.env` ignorado; `.dockerignore` del server | T-002: variables Google y guía del dueño |
| B-01 | Compose levanta db/server/client con readiness y una llamada real frontend → backend; rebuild/reinicio conservan datos; tests limpian solo lo suyo | pendiente | db/server sanos y persistencia comprobada (T-000) | T-001: client y llamada real |
| B-02 | PostgreSQL, Flyway desde DB vacía, validación del esquema e integración con Testcontainers con la versión acordada; desarrollo y pruebas no comparten datos | verificado | 2026-10-12, árbol de T-000 sobre base `2d06bbb`: `docker compose --profile verify run --rm server-tests` → BUILD SUCCESS (7 IT con `postgres:18.6`: Flyway V1, `validate`, versión 18.x); Compose usa el volumen `stockpilot_db-data`, Testcontainers contenedores efímeros | Revalidar si cambian migraciones o imagen |
| B-03 | Archivos reales con patrones API/DTO/validación/errores y frontend con router, tema, HTTP/Query y estados; formularios de referencia | pendiente | Parcial: persistencia (`identity/`) y errores de seguridad ProblemDetail (`security/`) | T-001: endpoint DTO, validación, client y formularios de referencia |
| S-01 | Login con proveedor OIDC local recorre callback real, crea/recupera identidad y mantiene sesión/recarga | pendiente | — | T-002 |
| S-02 | 401/403, permisos y propiedad, CSRF y logout con limpieza de sesión/cache verificados; proveedor de prueba aislado del perfil real | pendiente | Parcial: 401/403 ProblemDetail y CSRF activo probados en `SecurityConfigTest` | T-002 |
| S-03 | Estado de Google real explícito: smoke con evidencia o pendiente externo con acción del dueño | pendiente | — | T-002: guía de credenciales; dueño configura Google Cloud |
| V-01 | Pruebas de referencia reales: unitarios backend, integración PostgreSQL, componentes frontend, tipos/lint/formato/build | pendiente | Backend: 3 slice + 7 IT verdes, Spotless y JaCoCo (T-000) | T-001: client |
| V-02 | Playwright verifica build, API, DB y OIDC local del stack aislado, desktop/móvil, errores, reportes y cleanup | pendiente | — | T-003 |
| V-03 | Gate FULL ejecutado con éxito y checks requeridos verdes en CI para el código publicado | pendiente | — | T-003 |
| G-01 | Un Git, remoto/base correctos, kit fuera del índice; repo público con LICENSE, solo squash, borrado de ramas, secret scanning/push protection y ruleset con `verify-required`; checkout limpio sin plantilla funciona | pendiente | Git/exclusión/ancla, repo público, LICENSE MIT, ajustes de merge, secret scanning/push protection y ruleset `main-protection` (id 24964732, sin bypass) comprobados el 2026-10-12 | T-000: agregar `verify-required` como requerido tras su primer reporte y comprobar la CI en checkout limpio |
| G-02 | AUTONOMY con alcance, operaciones, límites y política reviewer → merger; capacidades Git/PR/CI comprobadas; modalidad de merge declarada | pendiente | [AUTONOMY.md](AUTONOMY.md) registrado; commit/push/PR comprobados en T-000 | Primer merge real (revisión de T-000) |
| G-03 | PRs de M0 revisados, con checks exigidos y merges confirmados por GitHub | pendiente | — | T-000…T-003 |
| H-01 | AGENTS breve, CLAUDE.md que solo importan `@AGENTS.md`; SETUP/TESTING, arquitectura, protocolos, STATUS/BACKLOG y HANDOFF coherentes, sin enlaces obligatorios al kit | pendiente | AGENTS/CLAUDE en raíz, server y client; docs-check valida importaciones y enlaces | Completar SETUP/TESTING de client/E2E (T-001/T-003) |
| H-02 | Primera tarea pequeña con spec vigente, alcance, aceptación, comandos y dependencias comprobables | pendiente | — | T-003 |
| H-03 | Prompt completo de la primera tarea, pendientes externos, modalidades reales, retoma y política de ciclos en ROADMAP | pendiente | Política §12.1 registrada en [ROADMAP.md](ROADMAP.md) | T-003 |

## Pendientes externos
| Pendiente | Responsable / acción | Impacto | Tareas afectadas | Condición de cierre |
|---|---|---|---|---|
| Credenciales Google OAuth (cliente web, URIs autorizadas) | Dueño, siguiendo la guía que entregue T-002 | Sin ellas no hay login real; el desarrollo sigue con el proveedor OIDC local | Smoke real de S-03; ninguna tarea de Junie depende de él | Smoke humano registrado sin datos personales |
| Disponibilidad de Junie Lite en AIR | Dueño: abrir AIR en esta raíz y confirmar que Junie Lite está seleccionable | Necesario para el traspaso | Recepción de Junie | Confirmación registrada en E-01 |

## Prompt de recepción de Junie Lite
Se escribe en T-003, con la primera tarea real.
