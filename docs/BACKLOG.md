# Tablero vivo
Próxima acción: revisar T-001 y corrección R1 (in_review, ronda 2) · reviewer de frontera en sesión nueva · `build/T-001-client-foundation-and-stack` / PR #2.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 2 | [T-001](tasks/T-001-client-foundation-and-stack.md) | in_review | Base client + stack Compose db/server/client | `build/T-001-client-foundation-and-stack` / [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) | R1 corregido; pendiente segunda revisión independiente del HEAD final |

## Listas — orden de ejecución
Ninguna: las tareas de M0 se habilitan en orden al confirmarse el merge de su dependencia.

## Bloqueadas
| Orden | ID | Estado | Dependencia / causa | Rol que resuelve | Condición de desbloqueo |
|---|---|---|---|---|---|
| 3 | [T-002](tasks/T-002-google-auth.md) | draft | T-001; contrato por refinar | planner (frontera) | T-001 mergeada y contrato refinado |
| 4 | [T-003](tasks/T-003-e2e-gate-and-handoff.md) | draft | T-002; contrato por refinar | planner (frontera) | T-002 mergeada y contrato refinado |

## Por refinar
| Necesidad | Relación | Notas |
|---|---|---|
| Primer flujo de M1 (ciclo C1 propuesto: alta de comercio y comercio activo) | ROADMAP M1; CA-01, RN-11, RN-18, RN-21 | Spec y T-004/T-005 se refinan en T-003 para Junie Lite |
| Resto del MVP (invitaciones, catálogo/inventario, ventas, anulación) | ROADMAP M2; F-01–F-04 | Se refina por tramos tras cada revisión de ciclo; no generar casilleros anticipados |
| Dashboard básico (P-07) | Deseable simplificable | Solo después de los flujos principales |
| Forwarded headers del server detrás del proxy del client | T-002 (OIDC); hallazgo de T-001 | nginx y Vite conservan el `Host` público y envían `X-Forwarded-*`; el server aún no los aplica (`server.forward-headers-strategy`). Necesario para que el `redirect_uri` de OIDC use el origen público: decidir en el contrato de T-002 |
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Hoy acepta cualquier `*.md`, también bajo `server/src` o `client/src`. Riesgo bajo; se puede limitar a raíz, `docs/` y `AGENTS/CLAUDE` con el gate técnico, dentro de una tarea de CI (candidato: T-003) |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
