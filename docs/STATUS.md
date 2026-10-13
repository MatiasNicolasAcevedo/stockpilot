# Estado del proyecto
Actualizado: 2026-10-13 (UTC-3) · sesión nueva: implementer de frontera T-002 parte A · Codex (API), familia GPT-6 declarada; identificador runtime exacto/esfuerzo reales no expuestos/verificables; high recomendado no se atribuye como observado

## Próxima acción
| Campo | Valor |
|---|---|
| Acción | Implementar y comprobar solo T-002 parte A (identidad), publicar checkpoint en misma rama/PR draft |
| Tarea y contrato | T-002 · [tasks/T-002-google-auth.md](tasks/T-002-google-auth.md) · [S-001 v1](specs/S-001-auth-google.md) |
| Estado | `in_progress` |
| Ejecutor | Frontera · implementer en esta sesión nueva, solo parte A |
| Rama / PR | `feat/T-002-google-auth` · [PR #3 draft](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3), único PR abierto; HEAD planner local/publicado `523acdf`, base `84d103c` comprobados al iniciar A |
| Hecho remoto comprobado | PR #2 MERGED `2026-10-13T18:06:01Z`, squash/main `84d103cd4c6b1c58f45f6272354ef49c918bce06`; APROBADO ronda 2 HEAD `b1cfff045d6a918ea8dc18d60451ef447e1a7a74`, base `9f061f55f99e614e36f8317150881ed9408a8c96`; CI HEAD `38443725709` y main `38444010437` SUCCESS. Sin PR abierto al inicio; T-001 done reconciliada en primer commit de rama T-002 |
| Bloqueo | Ninguno para A. Proveedor local/topología/pull pendientes B2; Google real externo con dueño. Junie aún no habilitada |

**M0:** T-000/T-001 integradas; bloque actual T-002 (contrato ready, implementación pendiente) · Verificados: 7/21 · pendientes: C-02, C-03, E-01, E-02, E-03, S-01, S-02, S-03, V-02, V-03, G-03, H-01, H-02, H-03 · bloqueados: ninguno · detalle en [HANDOFF.md](HANDOFF.md). BOOTSTRAP no es FULL; T-003 draft. Corte ROADMAP anticipado 2026-10-13 por cola sin ready y contrato fundacional; 0 tareas de producto, mismo objetivo/ciclo propuesto.

### Prompt de la siguiente sesión
```text
Retomá StockPilot en sesión nueva desde la raíz como implementer de frontera para T-002 parte A. Recomendado GPT-6.1 Sol/Codex u Opus 5.5/Claude Code, esfuerzo high; registrá modelo/herramienta/esfuerzo realmente expuestos, sin simular la selección. Leé AGENTS.md, docs/STATUS.md, docs/BACKLOG.md, docs/AUTONOMY.md, docs/agents/implementer.md, docs/tasks/T-002-google-auth.md, docs/specs/S-001-auth-google.md y docs/adr/0002-google-oidc-session-csrf-and-proxy.md; antes de tocar server leé server/AGENTS.md y SETUP/TESTING pertinentes.
Primero git status/último commit y gh pr view 3 --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup,comments: único PR #3 draft de feat/T-002-google-auth hacia main, HEAD local/publicado (SHA final/CI en comentario planner), base/checks y PR #2 MERGED squash 84d103cd4c6b1c58f45f6272354ef49c918bce06 con CI main verde. T-001 ya está done reconciliada; no comitear en su rama ni tercera ronda. Preservá cambios heredados y no lanzar otra sesión/modelo. Si hay cambios remotos/bloqueo, checkpoint de la misma tarea antes de decidir.
Contrato S-001 v1/ADR 0002 completo: Google OIDC gestionado por Spring, identidad issuer/subject sin fusión por email, sesión backend/cookie, CSRF SPA, callback por APP_PUBLIC_URL validado y forwarded headers saneados detrás de proxy; mock solo test/e2e, sin auth propia ni tokens en navegador. Tomá solo A primero: servicio transaccional de alta/recuperación/update sobre app_user, identidad estable, Clock, constraint/concurrencia PostgreSQL; no abrir rutas ni cambiar seguridad/proxy todavía. Registrá impacto y transición in_progress en tarea/STATUS/BACKLOG con docs-check. Publicá salida comprobada y checkpoint en misma rama/PR antes de pasar a B1/B2/B3/C1/C2/D; si hace falta retoma, sesión nueva misma tarea/parte. Una tarea/PR activos.
No modificar AUTONOMY/protecciones/aceptación ni datos persistentes. Antes de cada commit git ls-files -- plantilla vacío y staged explícito sin plantilla. Validar localmente antes de push, CI confirma. PR draft verify-required falla por política y no es mergeable. BOOTSTRAP sigue vigente, no FULL; T-003 draft, M0 NO_LISTO 7/21. Google real externo con dueño, ningún secreto/configuración real leído o publicado. Código auth completo solo pasa a in_review con gate BOOTSTRAP/pruebas de contrato/smoke y revisión independiente posterior; esta planificación no cuenta como revisión de implementación.
```

## Salud
| Check | Último resultado | Commit/base evaluados | Evidencia |
|---|---|---|---|
| Back: unitarios + integración | OK local, 9 slice + 7 IT, cero fallos/omisiones | revisión ronda 2 sobre código `1895966`, base `9f061f5` | `bash scripts/verify.sh` 2026-10-13; SHA/CI final en PR #2 |
| Front: unitarios/componentes | OK local en contenedor, 35 tests en 6 archivos; 502 y 504 con Reintentar | corrección R1 | idem |
| Build/lint | Spotless, `tsc -b` (incluye tests), ESLint 0 warnings, Prettier y build OK | corrección R1 | idem; aviso bundle ya en BACKLOG |
| Stack / manual | healthy; SPA/API real; 401/403; IP resuelta 504 1003,173 ms, DNS frío 502 1005,310 ms; UI error/Reintentar; persistencia OK | revisión ronda 2, código `1895966` | script de regresión + curl vía 5173 + Brave 375/1280 px; volumen conservado |
| Playwright desktop/mobile | no materializado | — | T-003 |
| CI y docs-check | T-001 CI HEAD/main SUCCESS; planificación T-002 docs-check containerizado exit 0, 36 Markdown/4 tareas | T-001 HEAD `b1cfff0`, main `84d103c`; diff documental T-002 | Runs `38443725709`/`38444010437`; log `$TEMP/stockpilot-T002-planner-docs.log`. CI draft T-002 no autoriza merge |
| Cobertura back/front | back JaCoCo ejecutado, umbral M0 = 0; front 96,07 % líneas / 89,87 % ramas | corrección R1 | gate local; no se presenta como FULL |

## Checkpoint breve
Inicio A: árbol limpio sin heredados; gh reconcilió HEAD `523acdf`, base `84d103c`, único PR #3 draft y PR #2 MERGED/CI main verde. Transición conjunta in_progress con impacto en tarea. Próxima acción: docs-check, publicación del tablero, línea de base backend y servicio/tests de identidad. Logs `$TEMP/stockpilot-T002-A-start.log` y `$TEMP/stockpilot-T002-A-baseline.log`; cleanup runners --rm/Testcontainers. Sin operar stack persistente. Modelo Codex API/familia GPT-6 declarada, exacto/esfuerzo no verificables. No avanzar a B en esta sesión sin salida A publicada.

Antecedente planner:
T-001 done reconciliada en primer commit `c9a8b59` de rama T-002: veredicto/merge y CI HEAD/main consultados con gh; sin reejecutar ni atribuir pruebas de ronda 2 a planner. Contrato S-001/ADR 0002 refinado y partes A/B1/B2/B3/C1/C2/D secuenciales dentro de la tarea mayor M0. T-002 ready con PR #3 draft; implementación solo en nueva sesión. Diff documental, docs-check containerizado exit 0 (36 Markdown/4 tareas/HANDOFF 7/21), revalidado al cierre, log `$TEMP/stockpilot-T002-planner-docs.log`. SHA final/CI y HEAD local=remoto se comprueban tras push y se comentan en PR #3. Sin cambios heredados, stack de desarrollo no operado, cleanup pendiente ninguno. Kit mejorado solo local/excluido. Git/network/Git Bash requieren elevación técnica del sandbox para operaciones ya autorizadas; no hubo rechazo de auto-review. Próxima acción ejecutable: sesión nueva, `gh pr view 3`, parte A. El prompt único vigente está arriba.

## Últimas sesiones
- 2026-10-13 · planner T-002 + reconciliación T-001 · Codex API/GPT-6 declarado, exacto/esfuerzo no expuestos; contrato S-001 v1, ADR 0002 y división antes de implementar; corte ROADMAP anticipado. Sin código ni cambio de executor; próxima sesión implementer frontera.
- 2026-10-13 · revisión T-001 ronda 2 → merger elegible del mismo PR · Codex (API), familia declarada GPT-6; identificador exacto/esfuerzo no expuestos; Opus/Claude/high recomendados no disponibles · sesión distinta de implementación/R1, pruebas independientes y transición documental; SHA/CI/veredicto/merge en PR #2.
- 2026-10-13 · corrección R1 de T-001 · implementer de frontera · Codex (familia declarada GPT-6, identificador runtime/esfuerzo no expuestos; Opus/Claude solicitados no disponibles en esta sesión) · misma rama/PR, regresión roja/verde, límites DNS/conexión y evidencia real; a segunda revisión.
- 2026-10-13 · revisión T-001, ronda 1 · Codex; GPT-6.1 Sol/high solicitados (runtime no expone identificador verificable) · sesión distinta de implementación; diff, gate, stack y navegador; R1 y transición `changes_requested`; SHA/CI finales en veredicto del PR #2.
- 2026-10-13 · implementación T-001 · Opus 5.5 / Claude Code · reconciliación de T-000, endpoint `system/info` + ProblemDetail de validación, base client, Dockerfile/nginx/Compose, suite client en verify.sh y CI; PR #2 a revisión.
- 2026-10-12 · revisión → merger T-000 · Opus 5.5 / Claude Code (sesión distinta de la implementación) · veredicto APROBADO y merge `9f061f5` confirmado.
- 2026-10-12 · implementación T-000 · Opus 5.5 / Claude Code · inventario, ancla, repo y ruleset, base server, documentación, CI; PR #1 a revisión.
