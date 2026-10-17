# Tablero vivo
Checkpoint 2026-10-16: D1 completa (planner/implementer documental de frontera): contrato v2 de cierre técnico y adopción, checklist v2 de HANDOFF con trazabilidad 1:1 (8/22; v1 congelado 9/21), ADR 0003 de Swagger opt-in y docs-check v2 con 14 rojos dirigidos. Inicio local=PR `3a973e8` (CI suites con e2e SUCCESS, agregado rechazo DRAFT), mismo #4 OPEN/draft; SHA/CI de publicación en comentario del PR. D2/E pendientes; Junie no habilitada.

Próxima acción: T-003 in_progress; A/B/C/D1 entregadas; sesión nueva de frontera solo D2 (implementar ADR 0003: Swagger/OpenAPI opt-in con pruebas reforzadas y smoke de navegador real), misma rama y PR #4 OPEN/draft. T-002 done: PR #3 MERGED `512bfd9`, R2 APROBADO y CI HEAD/main BOOTSTRAP verdes comprobados el 2026-10-14.

Corte ROADMAP 2026-10-16: cambio de objetivo del dueño, sin continuidad comercial; 0 tareas de producto. Contrato técnico T-003 v1 de A/B/C conservado y cumplido; D1 registró el contrato v2 y el checklist v2 (AC-11/AC-12 v1 sustituidos sin cumplirse, AC-13 nuevo), sujetos a la revisión independiente de E. HANDOFF v2 NO_LISTO 8/22; E-01 sin disponibilidad Junie y parte ordinaria de B-01 trasladada a S-03 con acción del dueño.

**Límite del dueño (2026-10-16, sustituye el orden del 2026-10-14):** base técnica funcionando/conectada, tests/E2E, FULL/CI y Swagger/OpenAPI utilizable → M0 revisada/mergeada/reconciliada → consolidar kit local → extraer/validar/publicar starter genérico en repo propio → **StockPilot detenido antes de iniciar Junie**. Sin S-002/T-004 comerciales ni M1…M3. D1 refinó cierre técnico/adopción y revisión explícita del checklist histórico; D2 implementa el smoke Swagger según ADR 0003; A/B/C y S-001 se conservan. No marcar 21/21 por cambiar objetivo ni iniciar recepción. Kit/starter fuera de T-003, sin otra tarea/PR activa ahora. El dueño informa que el nombre ya existe; no archivar/renombrar ni cambiar ajustes automáticamente.

Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004 (sin tarea comercial nueva en este repo). WIP máximo: 1 tarea / 1 PR de tarea.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|

| 4 | [T-003](tasks/T-003-e2e-gate-and-handoff.md) | in_progress | Base E2E/FULL; A/B/C/D1 completas (contrato v2, checklist v2, ADR 0003), retomar solo D2 Swagger opt-in sin negocio | `ci/T-003-e2e-gate-and-handoff` / [#4](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/4) draft | D2 ejecutable; si springdoc exige salir de `/api/docs/` o ampliar proxies, checkpoint y enmienda del ADR; S-03 (Google real/stack ordinario) con acción del dueño |

## Listas
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|

## Bloqueadas
| Orden | ID | Estado | Dependencia / causa | Rol que resuelve | Condición de desbloqueo |
|---|---|---|---|---|---|

## Por refinar
| Necesidad | Relación | Notas |
|---|---|---|
| Primer flujo M1 y resto del negocio StockPilot | Contexto histórico; continuidad retirada por dueño 2026-10-16 | No refinar S-002 ni T-004/T-005 comerciales; no tomar implementación M1…M3 ni iniciar Junie en este repo |
| Cierre técnico y Swagger utilizable | Pedido del dueño 2026-10-16; T-003 D/E | Refinado en D1 (2026-10-16): contrato v2 y checklist v2 con trazabilidad, ADR 0003 (opt-in local bajo `/api/docs/`, solo GET, smoke de navegador system/info 200 y me 401). Implementación D2 y evidencia/revisión E pendientes; se quita de la cola al mergear T-003 |
| Consolidar kit personal y crear primer starter; detener StockPilot | Pedido del dueño 2026-10-16; después de M0 | Primero consolidación genérica local; luego extracción/validación/publicación en carpeta/repo propios, FULL/CI y ensayo desde copia limpia: contexto de app ficticia distinta, instalar/levantar/probar/detener/retomar, stack conectado, E2E y Swagger. Fuera de T-003; sin otro PR activo ahora. Nombre/ruta se concretan al refinar. Registrar detención antes de Junie y no emitir prompt de recepción aquí |
| Resto del MVP (invitaciones, catálogo/inventario, ventas, anulación) | ROADMAP M2 histórico; F-01–F-04 | Suspendido por decisión del dueño 2026-10-16; no tomar tareas |
| Dashboard básico (P-07) | Deseable histórico | Suspendido junto al negocio |
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Mutaciones de negocio y fin de sesión | Hallazgo T-002 C2; client AGENTS/ARCHITECTURE | Query no cancela el fetch de una mutación en vuelo: tras logout/expiración su `onSuccess` podría escribir cache privada. Al crear las primeras mutaciones de M1, invalidar (no `setQueryData`) o abortar con la señal de sesión, con prueba de logout en vuelo |
| Cierre de sesión por callback OIDC cross-site | Observación no bloqueante de la revisión R1 de T-002; ADR 0002/S-001 AC-06 | El failure handler invalida la sesión ante cualquier callback fallido (B3, replay). Una navegación top-level desde otro sitio a `/login/oauth2/code/google?state=…` lleva la cookie Lax y cierra la sesión sin CSRF; impacto bajo (sin toma de cuenta). Decidir si se documenta como consecuencia aceptada en ADR 0002 o se endurece sin reabrir el replay autenticado (con su prueba), antes de un despliegue |
| Stack de desarrollo sin credenciales Google | Hallazgo de la corrección R1 de T-002; HANDOFF B-01/S-03/E-02; T-003 | Desde T-002 el stack ordinario (perfil `google`) no arranca sin `GOOGLE_CLIENT_ID`/`SECRET`, a propósito y sin fallback. Junie y los agentes solo pueden operar stacks aislados con el proveedor local (`compose.auth-test.yml`). Absorbido en T-003 A/AC-10: entrada dev local explícita nginx/Vite con proyecto/datos ficticios y cleanup, sin fallback al mock en el perfil real. Resuelto A con nginx/Vite y HMR/restart/rebuild/retoma probados; B-01 ordinario se revalida con dueño, sin sustituirlo por E2E |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Resuelto en T-003 C/AC-08 (2026-10-16): Markdown raíz/`docs/**/*.md`/AGENTS-CLAUDE conocidos/LICENSE, solo regulares A/M, `--raw -z`; rojo previo de la allowlist anterior y matriz de 37 casos. Se quita de la cola al mergear T-003 |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-002](tasks/T-002-google-auth.md) | done | OIDC/sesión/CSRF/proxies/UI integrados; R2 APROBADO, cierre reconciliado en primer commit T-003 | [#3](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) → `512bfd9` (2026-10-14), CI HEAD/main BOOTSTRAP verde |
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
