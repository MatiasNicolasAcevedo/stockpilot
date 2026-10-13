# Estado del proyecto
Actualizado: 2026-10-13 (UTC-3) · sesión nueva: implementer de frontera T-002 parte B1 · Codex (API), basado en GPT-6 según entorno; identificador runtime exacto/esfuerzo reales no expuestos/verificables; high recomendado no se atribuye como observado

## Próxima acción
| Campo | Valor |
|---|---|
| Acción | Implementer de frontera ejecuta solo T-002 B1; inicio reconciliado, impacto registrado, docs-check y línea de base antes de código |
| Tarea y contrato | T-002 · [tasks/T-002-google-auth.md](tasks/T-002-google-auth.md) · [S-001 v1](specs/S-001-auth-google.md) |
| Estado | `in_progress` |
| Ejecutor | Frontera · implementer B1 en esta sesión nueva abierta por el dueño |
| Rama / PR | `feat/T-002-google-auth` · [PR #3 draft](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3), único PR abierto; inicio A `523acdf`, transición `6e195ea`, base `84d103c`; SHA final A/CI/coincidencia remota en comentario de salida tras push |
| Hecho remoto comprobado | PR #2 MERGED `2026-10-13T18:06:01Z`, squash/main `84d103cd4c6b1c58f45f6272354ef49c918bce06`; APROBADO ronda 2 HEAD `b1cfff045d6a918ea8dc18d60451ef447e1a7a74`, base `9f061f55f99e614e36f8317150881ed9408a8c96`; CI HEAD `38443725709` y main `38444010437` SUCCESS. Sin PR abierto al inicio del planner; T-001 done reconciliada en primer commit de rama T-002 |
| Bloqueo | Ninguno para B1. Proveedor local/topología/pull pendientes B2; Google real externo con dueño. Junie aún no habilitada |

**M0:** T-000/T-001 integradas; bloque actual T-002 (A identidad local probada, B1/B2/B3/C1/C2/D pendientes) · Verificados: 7/21 · pendientes: C-02, C-03, E-01, E-02, E-03, S-01, S-02, S-03, V-02, V-03, G-03, H-01, H-02, H-03 · bloqueados: ninguno · detalle en [HANDOFF.md](HANDOFF.md). BOOTSTRAP no es FULL; T-003 draft. Corte ROADMAP anticipado 2026-10-13 por cola sin ready y contrato fundacional; 0 tareas de producto, mismo objetivo/ciclo propuesto.

### Prompt de la siguiente sesión
```text
Retomá StockPilot en sesión nueva desde la raíz como implementer de frontera para T-002 parte B1. Recomendado GPT-6.1 Sol/Codex u Opus 5.5/Claude Code, esfuerzo high; registrá modelo/herramienta/esfuerzo realmente expuestos, sin simular selección ni lanzar otra sesión/modelo. Leé AGENTS.md, STATUS/BACKLOG/AUTONOMY, docs/agents/implementer.md, tarea T-002, S-001 v1 y ADR 0002; antes de tocar server leé server/AGENTS.md y SETUP/TESTING pertinentes.
Primero git status/último commit y gh pr view 3 --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup,comments. Único PR #3 draft, feat/T-002-google-auth hacia main; SHA final/CI de A en comentario de salida. Base comprobada 84d103cd4c6b1c58f45f6272354ef49c918bce06, PR #2 MERGED/CI main verde; T-001 done, sin tercera ronda ni commits en su rama. Preservá heredados; si cambió remoto/base o hay bloqueo, checkpoint de esta misma tarea antes de decidir.
A entregó IdentityService/Profile, update AppUser y Clock UTC, 16 unitarios + 5 IT nuevos con PostgreSQL 18.6, carrera sincronizada/constraint/rollback y relectura en tx nueva; test falla sin recuperación. No hay rutas nuevas ni seguridad/proxy/UI de auth implementados. T-002 sigue in_progress; no revisar ni mergear parcialmente.
Tomá solo B1 primero: OIDC Google gestionado por Spring después de validación, principal local, GET me/csrf, sesión/cookies/CSRF/logout, destinos internos fijos y perfiles sin fallback; slices verdes. Identidad issuer/subject sin fusión por email; ningún rol comercial ni tokens en navegador. APP_PUBLIC_URL validado fija callback; forwarding solo junto al saneamiento y server interno de B2. No activar aisladamente confianza en headers ni afirmar protocolo real probado por oidcLogin. B2/proveedor/proxies, B3/protocolo y C1/C2/D quedan pendientes hasta salidas secuenciales publicadas.
Antes de editar registrá impacto/archivos efectivos y checkpoint en tarea/STATUS/BACKLOG con docs-check. Reusar servicio A; conservar V1, constraint y datos persistentes. No modificar AUTONOMY/protecciones/aceptación. Antes de cada commit git ls-files -- plantilla vacío, staged de rutas explícitas sin kit. Validación local antes de push; CI confirma, DRAFT verify-required falla por política. Misma rama/PR, una tarea/PR activos; publicar salida comprobada/checkpoint antes de avanzar, retoma misma parte si hace falta.
BOOTSTRAP vigente, no FULL; T-003 draft, M0 NO_LISTO 7/21. Google real externo con dueño; no leer/publicar secretos/config real. Solo auth completa tras D pasa a in_review con BOOTSTRAP/pruebas de contrato/smoke y revisión independiente posterior. Planner y salida A no son revisión independiente. Prompt único vigente en STATUS.
```

## Salud
| Check | Último resultado | Commit/base evaluados | Evidencia |
|---|---|---|---|
| Back: unitarios + integración | OK local, 25 unit/slices + 12 IT, cero fallos/omisiones; 16 + 5 nuevos de identidad | T-002 A, base `84d103c`; SHA final en PR #3 | `bash scripts/verify.sh` exit 0 2026-10-13; log `$TEMP/stockpilot-T002-A-gate.log`; mutación sin recuperación concurrente roja y restauración |
| Front: unitarios/componentes | OK local en contenedor, 35 tests en 6 archivos | T-002 A, sin cambios client | mismo gate A; smoke UI previo T-001 R1, no auth UI nueva |
| Build/lint | Spotless, `tsc -b` (incluye tests), ESLint 0 warnings, Prettier y build OK | T-002 A | mismo gate; aviso bundle ya en BACKLOG |
| Stack / manual | healthy; SPA/API real; 401/403; IP resuelta 504 1003,173 ms, DNS frío 502 1005,310 ms; UI error/Reintentar; persistencia OK | revisión ronda 2, código `1895966` | script de regresión + curl vía 5173 + Brave 375/1280 px; volumen conservado |
| Playwright desktop/mobile | no materializado | — | T-003 |
| CI y docs-check | docs-check A containerizado exit 0, 36 Markdown/4 tareas; cierre documental revalidado antes del commit | base `84d103c`; SHA/CI A en comentario PR #3 tras push | log `$TEMP/stockpilot-T002-A-close-docs.log`; main run `38444010437` SUCCESS comprobado. CI draft verify-required falla por política y no autoriza merge |
| Cobertura back/front | back JaCoCo ejecutado, umbral M0 = 0; front 96,07 % líneas / 89,87 % ramas | T-002 A | gate local; no se presenta como FULL |

## Checkpoint breve
Inicio B1: árbol limpio, HEAD local/PR `22c4a1e`, base/main `84d103c`, único PR #3 OPEN/draft y comentario A comprobados mediante gh. CI A suites emitidas SUCCESS, verify-required FAILURE esperado por DRAFT. Impacto/archivos en tarea: OIDC → servicio A, principal/me/csrf/sesión/logout y perfiles; sin forwarding/proxies/UI ni migración. Próxima operación: docs-check/transición publicada y baseline backend; logs `$TEMP/stockpilot-T002-B1-{start,baseline}.log`, cleanup runners efímeros. Codex API basado en GPT-6, runtime exacto/esfuerzo no expuestos; sin simulación o delegación. Prompt B1 sigue vigente hasta salida publicada.

Salida A: IdentityService/Profile, actualización AppUser y Clock UTC; identidad exacta/estable, atributos opcionales, transacciones independientes y recuperación solo de constraint de identidad tras rollback. 16 unitarios + 5 IT nuevos verdes; concurrencia sincronizada exige ID/fila única y tercera transacción. Mutación sin recuperación falla por 23505 real; servicio restaurado. Un error inicial del fixture spy fue corregido/reprobado sin tocar aceptación. Gate BOOTSTRAP completo local exit 0 (25 unit/slices + 12 IT, client 35 tests/tsc/lint/formato/build, docs), log `$TEMP/stockpilot-T002-A-gate.log`; docs final en `$TEMP/stockpilot-T002-A-close-docs.log`. Sin cambios heredados, sin rutas/seguridad/proxy/UI nuevas ni operación de datos persistentes. Cleanup runners --rm/Testcontainers, sin pendientes. Kit mejorado solo local/excluido. Transición publicada `6e195ea`; HEAD final/CI/local=remoto se comprueban y comentan tras push en PR #3 draft. Siguiente sesión B1, mismo executor de frontera; no in_review ni merge parcial. Codex API/familia GPT-6 declarada, exacto/esfuerzo no verificables. Elevación técnica autorizada para Git/network/Docker/Bash, ningún rechazo de auto-review.

Antecedente planner:
T-001 done reconciliada en `c9a8b59`, contrato/división publicados en `523acdf`, docs-check verde; detalle histórico en tarea/comentario planner del PR #3. Esta planificación no fue revisión independiente de implementación. El prompt único vigente B1 está arriba.

## Últimas sesiones
- 2026-10-13 · implementación T-002 A · Codex API/familia GPT-6 declarada, exacto/esfuerzo no expuestos; servicio interno, Clock y pruebas PostgreSQL/concurrencia, mutación roja/verde y BOOTSTRAP local. PR #3 draft/T-002 in_progress, retoma B1 en sesión nueva; sin auth completa ni revisión independiente.
- 2026-10-13 · planner T-002 + reconciliación T-001 · Codex API/GPT-6 declarado, exacto/esfuerzo no expuestos; contrato S-001 v1, ADR 0002 y división antes de implementar; corte ROADMAP anticipado. Sin código ni cambio de executor; próxima sesión implementer frontera.
- 2026-10-13 · revisión T-001 ronda 2 → merger elegible del mismo PR · Codex (API), familia declarada GPT-6; identificador exacto/esfuerzo no expuestos; Opus/Claude/high recomendados no disponibles · sesión distinta de implementación/R1, pruebas independientes y transición documental; SHA/CI/veredicto/merge en PR #2.
- 2026-10-13 · corrección R1 de T-001 · implementer de frontera · Codex (familia declarada GPT-6, identificador runtime/esfuerzo no expuestos; Opus/Claude solicitados no disponibles en esta sesión) · misma rama/PR, regresión roja/verde, límites DNS/conexión y evidencia real; a segunda revisión.
- 2026-10-13 · revisión T-001, ronda 1 · Codex; GPT-6.1 Sol/high solicitados (runtime no expone identificador verificable) · sesión distinta de implementación; diff, gate, stack y navegador; R1 y transición `changes_requested`; SHA/CI finales en veredicto del PR #2.
- 2026-10-13 · implementación T-001 · Opus 5.5 / Claude Code · reconciliación de T-000, endpoint `system/info` + ProblemDetail de validación, base client, Dockerfile/nginx/Compose, suite client en verify.sh y CI; PR #2 a revisión.
- 2026-10-12 · revisión → merger T-000 · Opus 5.5 / Claude Code (sesión distinta de la implementación) · veredicto APROBADO y merge `9f061f5` confirmado.
- 2026-10-12 · implementación T-000 · Opus 5.5 / Claude Code · inventario, ancla, repo y ruleset, base server, documentación, CI; PR #1 a revisión.
