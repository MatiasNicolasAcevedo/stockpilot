# Tablero vivo
Checkpoint 2026-10-17: revisión T-004 ronda 1 (reviewer de frontera, Opus 5.5/Claude Code, sesión distinta de la implementación). Precondición del caso A reconciliada (HEAD/PR 456a2bd, base 8cbdaab, CI ready 39002790741 verify-required SUCCESS, comentario de publicación con FULL en clon limpio). Hechos de #4 (MERGED 8cbdaab, APROBADO, cierre del merger, CI 39000342996/39001033419) contrastados con gh; diff completo solo Markdown, árbol técnico idéntico a main; HANDOFF v2 22/22 aceptado criterio por criterio; docs-check OK, DOCS_ONLY y --docs exit 0. Favorable → mergeable; SHA/CI del HEAD documental, veredicto y merge en PR #5.

Próxima acción: T-004 mergeable; publicar veredicto APROBADO tras la CI del HEAD documental y merger del mismo PR #5 según AUTONOMY. Después de su merge, consolidar el kit local (sin commits en StockPilot) con el caso B del prompt de STATUS. Sin negocio ni Junie.

Corte ROADMAP 2026-10-17: cierre del hito M0 con merges #1–#4 confirmados y CI FULL de main; 0 tareas de producto. Base técnica verificada; S-03 (Google real y stack ordinario) sigue como pendiente externo del dueño. Corte anterior 2026-10-16 por cambio de objetivo del dueño.

**Límite del dueño (2026-10-16, sustituye el orden del 2026-10-14):** base técnica funcionando/conectada, tests/E2E, FULL/CI y Swagger/OpenAPI utilizable → M0 revisada/mergeada/reconciliada → consolidar kit local → extraer/validar/publicar starter genérico en repo propio → **StockPilot detenido antes de iniciar Junie**. Sin S-002 ni tareas comerciales ni M1…M3; T-004 es la reconciliación documental del cierre. No iniciar recepción Junie. Kit y starter fuera de este repo, sin otra tarea/PR activa. El dueño informa que el nombre ya existe; no archivar/renombrar ni cambiar ajustes automáticamente.

Prompt canónico: [STATUS → siguiente sesión](STATUS.md#prompt-de-la-siguiente-sesión).
Próximo ID libre: T-005 (sin tarea comercial nueva en este repo). WIP máximo: 1 tarea / 1 PR de tarea.

## En vuelo
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|
| 5 | [T-004](tasks/T-004-m0-closure-reconciliation.md) | mergeable | Reconciliar el cierre técnico de M0: T-003 done, HANDOFF v2 22/22, observaciones de la revisión, corte ROADMAP y prompt del kit | `docs/T-004-m0-closure-reconciliation` / [#5](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/5), ready | Revisión ronda 1 favorable; veredicto tras CI del HEAD documental y merge del mismo PR |

## Listas
| Orden | ID | Estado | Objetivo | Rama / PR | Bloqueo |
|---|---|---|---|---|---|

## Bloqueadas
| Orden | ID | Estado | Dependencia / causa | Rol que resuelve | Condición de desbloqueo |
|---|---|---|---|---|---|

## Por refinar
| Necesidad | Relación | Notas |
|---|---|---|
| Primer flujo M1 y resto del negocio StockPilot | Contexto histórico; continuidad retirada por dueño 2026-10-16 | No refinar S-002 ni tareas comerciales (T-004 es la reconciliación documental del cierre); no tomar implementación M1…M3 ni iniciar Junie en este repo |
| Consolidar kit personal y crear primer starter; detener StockPilot | Pedido del dueño 2026-10-16; desbloqueado por el cierre de M0 (T-003 done, T-004) | Tras el merge de T-004: primero consolidación genérica del kit local, sin commits en StockPilot; luego extracción/validación/publicación del starter en carpeta/repo propios según el [contrato de adopción genérica](tasks/T-003-e2e-gate-and-handoff.md#contrato-de-adopción-genérica-fuera-de-t-003): copia limpia con contexto de app ficticia distinta, instalar/levantar/probar/detener/retomar, stack conectado, E2E, Swagger, FULL/CI. Nombre/ruta/publicación los decide el dueño en esa tarea. Al final, PR documental de constancia de detención antes de Junie; nunca prompt de recepción aquí |
| Resto del MVP (invitaciones, catálogo/inventario, ventas, anulación) | ROADMAP M2 histórico; F-01–F-04 | Suspendido por decisión del dueño 2026-10-16; no tomar tareas |
| Dashboard básico (P-07) | Deseable histórico | Suspendido junto al negocio |
| Tamaño del bundle del client (539 kB, aviso de Vite > 500 kB) | Rendimiento; hallazgo de T-001 | MUI + Router + Query + Zod en un solo chunk. Code-splitting por ruta (`lazy`) cuando existan pantallas de M1; no subir `chunkSizeWarningLimit` para ocultarlo |
| Mutaciones de negocio y fin de sesión | Hallazgo T-002 C2; client AGENTS/ARCHITECTURE | Query no cancela el fetch de una mutación en vuelo: tras logout/expiración su `onSuccess` podría escribir cache privada. Al crear las primeras mutaciones de M1, invalidar (no `setQueryData`) o abortar con la señal de sesión, con prueba de logout en vuelo |
| Cierre de sesión por callback OIDC cross-site | Observación no bloqueante de la revisión R1 de T-002; ADR 0002/S-001 AC-06 | El failure handler invalida la sesión ante cualquier callback fallido (B3, replay). Una navegación top-level desde otro sitio a `/login/oauth2/code/google?state=…` lleva la cookie Lax y cierra la sesión sin CSRF; impacto bajo (sin toma de cuenta). Decidir si se documenta como consecuencia aceptada en ADR 0002 o se endurece sin reabrir el replay autenticado (con su prueba), antes de un despliegue |

## Hechas recientes
| ID | Estado | Resultado | PR / merge |
|---|---|---|---|
| [T-003](tasks/T-003-e2e-gate-and-handoff.md) | done | E2E Playwright, gate FULL/CI, Swagger opt-in y contrato de cierre técnico v2; APROBADO ronda 1, cierre reconciliado en T-004. Resolvió en BACKLOG: dev sin credenciales Google (A/AC-10; parte ordinaria en S-03), allowlist DOCS_ONLY acotada (C/AC-08), cierre técnico y Swagger (D1/D2) | [#4](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/4) → `8cbdaab` (2026-10-17), CI HEAD/main FULL verde |
| [T-002](tasks/T-002-google-auth.md) | done | OIDC/sesión/CSRF/proxies/UI integrados; R2 APROBADO, cierre reconciliado en primer commit T-003 | [#3](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3) → `512bfd9` (2026-10-14), CI HEAD/main BOOTSTRAP verde |
| [T-001](tasks/T-001-client-foundation-and-stack.md) | done | Client + stack integrados; R1 cerrado por ronda 2; cierre reconciliado en rama T-002 | [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2) → `84d103c` (2026-10-13), CI HEAD/main BOOTSTRAP verde |
| [T-000](tasks/T-000-governance-and-server-foundation.md) | done | Gobierno del repo + base server PostgreSQL/Flyway | [#1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/1) → `9f061f5` (2026-10-13), CI de `main` verde |
