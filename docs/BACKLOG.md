# Tablero vivo
Próxima acción: revisar y mergear si es elegible T-000 (in_review) · frontera, sesión distinta (recomendado GPT-6.1 Sol) · `chore/T-000-governance-and-server-foundation` / PR #1.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 1 | [T-000](tasks/T-000-governance-and-server-foundation.md) | in_review | Gobierno del repo + base server PostgreSQL/Flyway | `chore/T-000-governance-and-server-foundation` / [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) | ninguno |

## Listas — orden de ejecución
Ninguna: las tareas de M0 se habilitan en orden al confirmarse el merge de su dependencia.

## Bloqueadas
| Orden | ID | Estado | Dependencia / causa | Rol que resuelve | Condición de desbloqueo |
|---|---|---|---|---|---|
| 2 | [T-001](tasks/T-001-client-foundation-and-stack.md) | blocked | T-000 sin merge | implementer (frontera) | GitHub confirma MERGED del PR de T-000 |
| 3 | [T-002](tasks/T-002-google-auth.md) | draft | T-001; contrato por refinar | planner (frontera) | T-001 mergeada y contrato refinado |
| 4 | [T-003](tasks/T-003-e2e-gate-and-handoff.md) | draft | T-002; contrato por refinar | planner (frontera) | T-002 mergeada y contrato refinado |

## Por refinar
| Necesidad | Relación | Notas |
|---|---|---|
| Primer flujo de M1 (ciclo C1 propuesto: alta de comercio y comercio activo) | ROADMAP M1; CA-01, RN-11, RN-18, RN-21 | Spec y T-004/T-005 se refinan en T-003 para Junie Lite |
| Resto del MVP (invitaciones, catálogo/inventario, ventas, anulación) | ROADMAP M2; F-01–F-04 | Se refina por tramos tras cada revisión de ciclo; no generar casilleros anticipados |
| Dashboard básico (P-07) | Deseable simplificable | Solo después de los flujos principales |

## Hechas recientes
Ninguna todavía.
