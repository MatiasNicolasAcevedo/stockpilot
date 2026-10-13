# Tablero vivo
Próxima acción: T-002 ready con S-001 v1/ADR 0002; nueva sesión implementer de frontera toma parte A en la misma rama/PR draft. T-001 done reconciliada tras MERGED confirmado; ninguna tercera ronda.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

## En vuelo
Ninguna implementación en vuelo; planificación de T-002 publicada en su rama/PR draft, contrato listo para implementer en sesión nueva.

## Listas — orden de ejecución
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 3 | [T-002](tasks/T-002-google-auth.md) | ready | Google OIDC/sesión/CSRF: partes A → B1/B2/B3 → C1/C2 → D; primera salida identidad local | `feat/T-002-google-auth` / [#3 draft](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) | Ninguno para A; implementación solo en sesión nueva, proveedor local/red por verificar en B2; DRAFT no autoriza merge |

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
| Forwarded headers del server detrás del proxy del client | T-002 B2; hallazgo de T-001 ya refinado | S-001/ADR 0002 fijan framework forwarding + saneamiento nginx/Vite, APP_PUBLIC_URL validado/callback fijo y server interno; implementación/prueba de spoofing pendiente, no deuda sin contrato |
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Hoy acepta cualquier `*.md`, también bajo `server/src` o `client/src`. Riesgo bajo; se puede limitar a raíz, `docs/` y `AGENTS/CLAUDE` con el gate técnico, dentro de una tarea de CI (candidato: T-003) |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
