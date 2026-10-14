# Tablero vivo
Próxima acción: corregir T-002 (changes_requested, ronda 1 de 2) · implementer de frontera en sesión nueva · solo documentación (README, client/AGENTS, ARCHITECTURE, SETUP, HANDOFF B-01, tarea) · `feat/T-002-google-auth` / PR #3. T-001 done.

Revisión R1 2026-10-14: gate BOOTSTRAP, smoke nginx/Vite y proxies independientes verdes sobre 67aca0e; sin defectos de conducta. Bloquea AC-10: documentación del estado intermedio y quickstart público/`client/AGENTS` que omiten el requisito de credenciales Google (el server no arranca sin ellas, a propósito).

Salida D 2026-10-13: smoke en Edge real por nginx y Vite contra el proveedor 3.0.3 (login por teclado, recarga, expiración sin bucle, logout, cancelación y callback huérfano; 1280/375 sin overflow, capturas en docs/evidence/T-002), OpenAPI de auth generado desde el código y verificado sin publicar `/v3/api-docs`, guía Google real en SETUP y documentación/HANDOFF alineados (10/21). Gate BOOTSTRAP local verde. Google real S-03 externo con dueño.
Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-004. WIP máximo: 1 tarea / 1 PR de tarea.

Salida C2 2026-10-13: UI de sesión y cache del client sobre el transporte C1: /login con navegación completa al inicio OIDC y mensaje fijo de fallo, shell con usuario/visitante, CSRF antes de habilitar mutaciones, expiración por 401 con limpieza de cache privada sin reintento ni redirección, logout con errores/reintento, remonte por identidad y dos identidades consecutivas aisladas. 24 tests nuevos (100 client) y 9 mutaciones rojas/restauradas; gate BOOTSTRAP local verde. Aceptación/navegador/documentación D pendientes; no auth completa/revisión/merge parcial.

Salida C1 2026-10-13: transporte client de auth sobre el cliente HTTP único: cookie XSRF-TOKEN vigente por petición, X-XSRF-TOKEN solo en mutaciones same-origin, 401 al canal sessionEvents sin reintento, 403/red/5xx sin logout ni reenvío, renovación CSRF con reintento explícito y Zod de me nullable; hooks de sesión/logout sin efectos de UI. 41 tests nuevos (76 client) y 7 mutaciones rojas/restauradas; gate BOOTSTRAP local verde. La misma sesión publicó B3 heredada sin cambios (b653bbd). UI/cache C2 y aceptación D pendientes; no auth completa/revisión/merge parcial.

Salida B3 2026-10-13: 18 IT HTTP reales con Spring/Tomcat/PostgreSQL, proveedor 3.0.3 y fixture negativa HTTP/JWKS test con control positivo. Login/recarga/fijación/CSRF/logout/DB y state/nonce/issuer/aud/firma/expiración/cancelación/replays/errores comprobados, recuperación sin alta/auth inválida. Dos arreglos mínimos con regresiones rojas/verde y mutación sessionFixation roja/restaurada. Gate BOOTSTRAP exit 0: 77 unit/slices + 47 IT backend, 35 client tests/tsc/lint/formato/build/docs. Cleanup efímero completo; SHA/CI finales en comentario del PR #3 tras push. C1/C2/D pendientes; no auth completa/revisión/merge parcial.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 3 | [T-002](tasks/T-002-google-auth.md) | changes_requested | Google OIDC, sesión/CSRF, proxies y UI de sesión (A…D comprobadas) | `feat/T-002-google-auth` / [#3](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) | ninguno; 6 correcciones documentales de ronda 1, luego revisión ronda 2 |

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
| Mutaciones de negocio y fin de sesión | Hallazgo T-002 C2; client AGENTS/ARCHITECTURE | Query no cancela el fetch de una mutación en vuelo: tras logout/expiración su `onSuccess` podría escribir cache privada. Al crear las primeras mutaciones de M1, invalidar (no `setQueryData`) o abortar con la señal de sesión, con prueba de logout en vuelo |
| Cierre de sesión por callback OIDC cross-site | Observación no bloqueante de la revisión R1 de T-002; ADR 0002/S-001 AC-06 | El failure handler invalida la sesión ante cualquier callback fallido (B3, replay). Una navegación top-level desde otro sitio a `/login/oauth2/code/google?state=…` lleva la cookie Lax y cierra la sesión sin CSRF; impacto bajo (sin toma de cuenta). Decidir si se documenta como consecuencia aceptada en ADR 0002 o se endurece sin reabrir el replay autenticado (con su prueba), antes de un despliegue |
| Acotar la allowlist DOCS_ONLY del clasificador | CI; revisión de T-000 | Hoy acepta cualquier `*.md`, también bajo `server/src` o `client/src`. Riesgo bajo; se puede limitar a raíz, `docs/` y `AGENTS/CLAUDE` con el gate técnico, dentro de una tarea de CI (candidato: T-003) |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
