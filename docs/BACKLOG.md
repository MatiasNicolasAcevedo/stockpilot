# Tablero vivo
Próxima acción: dueño resuelve pin exacto del proveedor bloqueado de T-002; luego sesión nueva implementer frontera completa misma B2/rama/PR draft. Frontera conjunta probada y publicada parcialmente, sin B3. S-001 v1/ADR 0002 conservados. T-001 done; ninguna tercera ronda.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

Retoma B2 2026-10-13: HEAD heredado `272b9a1` local/remoto/PR y base `84d103c` reconfirmados; único PR #3 OPEN/draft, suites CI SUCCESS y verify-required FAILURE exclusivamente DRAFT. Decisión explícita del pin solicitada al dueño; sigue pendiente, sin proveedor ejecutado ni B3. Checkpoint de esta sesión en tarea/STATUS, conservando blocked.

Validación de retoma: docs-check containerizado exit 0 (36 Markdown/4 tareas/HANDOFF 7/21); cleanup del runner/red efímeros completo, sin operar DB/volumen persistente. Publicación/SHA/CI del checkpoint en comentario PR #3.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 3 | [T-002](tasks/T-002-google-auth.md) | blocked | A/B1 y frontera B2 probadas parcialmente/publicadas; proveedor B2 bloqueado, luego B3/C1/C2/D | `feat/T-002-google-auth` / [#3 draft](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) | Pin 3.1.4 pull not found/manifest unknown y tag/release 404; dueño decide fuente exacta o autoriza pin publicado 3.0.3 propuesto (sin ejecutar). Endpoints/topología no acreditados; no avanzar B3 ni merge parcial |

## Listas — orden de ejecución
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|

Ninguna tarea ready; retomar T-002 en vuelo.

## Bloqueadas
| Orden | ID | Estado | Dependencia / causa | Rol que resuelve | Condición de desbloqueo |
|---|---|---|---|---|---|
| 4 | [T-003](tasks/T-003-e2e-gate-and-handoff.md) | draft | T-002; contrato por refinar | planner (frontera) | T-002 mergeada y contrato refinado |

## Por refinar
| Necesidad | Relación | Notas |
|---|---|---|
| Primer flujo de M1 (ciclo C1 propuesto: alta de comercio y comercio activo) | ROADMAP M1; CA-01, RN-11, RN-18, RN-21 | Spec y T-004/T-005 se refinan en T-003 para Junie Lite |
| Resto del MVP (invitaciones, catálogo/inventario, ventas, anulación) | ROADMAP M2; F-01–F-04 | Se refina por tramos tras cada revisión de ciclo; no generar casilleros anticipados |
| Dashboard básico (P-07) | Deseable simplificable | Solo después de los flujos principales |
| Proveedor exacto OIDC y frontera de proxy | T-002 B2; hallazgo T-001 refinado | Frontera framework/nginx/Vite/origen/Host/server interno/diagnóstico y spoofing probados B2; proveedor exacto 3.1.4 inexistente en pull/API requiere decisión puntual, sin cambio de aceptación. Protocolo sigue B3 |
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Hoy acepta cualquier `*.md`, también bajo `server/src` o `client/src`. Riesgo bajo; se puede limitar a raíz, `docs/` y `AGENTS/CLAUDE` con el gate técnico, dentro de una tarea de CI (candidato: T-003) |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
