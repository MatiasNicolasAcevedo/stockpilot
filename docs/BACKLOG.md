# Tablero vivo
Próxima acción: implementer frontera ejecuta solo T-002 B3, misma rama/PR draft, con salida B2 completa/SHA/CI reconciliados. Pin 3.0.3 corregido con autorización del dueño; proveedor/capacidades/topología Windows/backend y gate BOOTSTRAP verificados. T-001 done.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

Salida B2 2026-10-13: pin autorizado 3.0.3 y trazabilidad S-001 v1/ADR 0002/tarea, fixture compatible, probe desde Windows/Node containerizado y discovery en Edge Windows/backend real. Windows requiere resolución por proceso al loopback, sin hosts globales ni validaciones relajadas. Gate BOOTSTRAP exit 0: 76 unit/slices + 29 IT backend, 35 client tests/typecheck/lint/formato/build/docs. Cleanup efímero completo; SHA/publicación/CI del cierre en comentario PR #3. Protocolo de aplicación B3 pendiente, M0 NO_LISTO 7/21.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 3 | [T-002](tasks/T-002-google-auth.md) | in_progress | A/B1/B2 comprobadas, retoma protocolo real B3; C1/C2/D pendientes | `feat/T-002-google-auth` / [#3 draft](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) | Ninguno para B3; pin 3.0.3 autorizado/verificado, Windows requiere resolución por proceso documentada; no revisión/merge parcial |

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
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Hoy acepta cualquier `*.md`, también bajo `server/src` o `client/src`. Riesgo bajo; se puede limitar a raíz, `docs/` y `AGENTS/CLAUDE` con el gate técnico, dentro de una tarea de CI (candidato: T-003) |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
