# ROADMAP

Hitos por resultados y dependencias, sin fechas inventadas. Intención y aceptación del producto: [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md). Cola y estado de tareas: [BACKLOG.md](BACKLOG.md).

**Decisión vigente · 2026-10-16:** el dueño retira la continuidad del producto porque informa que el nombre ya existe. Se termina la base técnica, se consolida kit y se extrae/valida/publica starter genérico; después se registra StockPilot detenido antes de iniciar Junie. No se renombra/archiva ni se cambian ajustes del repo automáticamente. [Alcance y evidencia exigida](tasks/T-003-e2e-gate-and-handoff.md#decisión-del-dueño--límite-de-continuidad--2026-10-16). Los hitos comerciales inferiores quedan históricos suspendidos.

## Hitos
| Hito | Objetivo | Criterio de salida | Ejecutor | Estado |
|---|---|---|---|---|
| M0 · Base verificable | Conservar scaffolds y completar la base técnica para extracción | Stack conectado desde copia limpia; auth local; unitarios/typecheck/integración; Playwright real; FULL local/CI; Swagger utilizable; revisión/merges confirmados. Contrato v2 de cierre y [checklist v2](HANDOFF.md#checklist-v2-de-cierre-técnico) registrados en T-003 D1 (v1 congelado, sin declarar 21/21 desde el cambio de objetivo) | Frontera | **Cerrado técnicamente (2026-10-17):** T-000…T-003 integradas (#1 `9f061f5`, #2 `84d103c`, #3 `512bfd9`, #4 `8cbdaab`), revisión independiente de cada PR y CI FULL de main 39001033419. HANDOFF v2 22/22 `CIERRE_TECNICO_VERIFICADO` reconciliado en T-004 (documental); v1 histórico congelado 9/21. S-03 (Google real) pendiente externo del dueño |
| M1 · Primer flujo útil (histórico) | Una funcionalidad vertical completa (ciclo C1) | Spec, persistencia, UI, E2E desktop/móvil y cobertura | Junie Lite (plan anterior) | Suspendido por dueño 2026-10-16; sin spec/tarea nueva |
| M2 · MVP (histórico) | Los cuatro flujos F-01–F-04 del contexto | CA-01–CA-19 y demo de negocio | Junie Lite (plan anterior) | Suspendido por dueño 2026-10-16 |
| M3 · Mantenimiento de producto (histórico) | Calidad del producto comercial | Regresiones y backlog comercial | Junie Lite (plan anterior) | Suspendido por dueño 2026-10-16 |

### M0 en cuatro tareas/PRs de frontera
| Tarea | Resultado | Depende de |
|---|---|---|
| [T-000](tasks/T-000-governance-and-server-foundation.md) | Gobierno, repo/ruleset, CI BOOTSTRAP + base server PostgreSQL/Flyway/Testcontainers | Scaffolds y credenciales Git |
| [T-001](tasks/T-001-client-foundation-and-stack.md) | Base client y stack Compose db/server/client con llamada real | T-000 |
| [T-002](tasks/T-002-google-auth.md) | Google OIDC, sesión, CSRF, identidad local y permisos base | T-001 |
| [T-003](tasks/T-003-e2e-gate-and-handoff.md) | E2E + FULL/CI + cierre técnico documentado para extracción; D revisa contrato/checklist y Swagger | T-002 |
| [T-004](tasks/T-004-m0-closure-reconciliation.md) | Reconciliación documental del cierre (no comercial, fuera de las cuatro): T-003 done, HANDOFF v2 22/22, corte de ciclo y prompt del kit | T-003 |

Dashboard y mejoras comerciales quedan suspendidos con M1…M3.

## Ciclo de producto
| Campo | Valor |
|---|---|
| Ciclo/hito actual | Ninguno de producto todavía: M0 es preparación y no cuenta para el ciclo |
| Primer ciclo propuesto | C1 alta de comercio/comercio activo queda histórico suspendido por el dueño el 2026-10-16; no generar spec/tareas comerciales ni iniciar Junie en StockPilot |
| Alcance y salida | Base técnica verificable para extracción; nuevo contexto de app y primer flujo solo en proyecto futuro desde el starter |
| Cadencia efectiva | 5 tareas de producto mergeadas (`counts_for_cycle: true`), además del cierre de hito o un disparador anticipado, lo que ocurra primero |
| Último corte revisado | 2026-10-17, cierre del hito M0 (T-004): merges #1 `9f061f5`, #2 `84d103c`, #3 `512bfd9`, #4 `8cbdaab` confirmados con gh; main CI 39001033419 SUCCESS FULL (seis checks). 0 tareas de producto mergeadas. Corte anterior: 2026-10-16, cambio de objetivo pedido por el dueño |
| Balance de la revisión | Objetivo vigente cumplido en su parte técnica: stack conectado desde copia limpia, OIDC local, unitarios/integración PostgreSQL/E2E desktop-móvil, FULL local y CI, Swagger opt-in, revisión independiente y merges confirmados (HANDOFF v2 22/22). Beneficio no observado: Google real y stack ordinario del dueño (S-03, externo). Deuda registrada en BACKLOG (bundle, mutaciones y fin de sesión, callback cross-site) sin efecto en el cierre; ninguna regresión abierta. Sin negocio ni Junie |
| Próximo tramo | Revisión/merge de T-004 → consolidar kit local (sin commits en StockPilot) → starter genérico extraído, validado desde copia limpia con contexto ficticio distinto y publicado en carpeta/repo propios → PR documental de constancia de detención de StockPilot antes de Junie. Un PR activo y sesiones separadas |
| Decisiones pendientes | Del dueño, en la tarea del starter: nombre, ruta, visibilidad y publicación del repo starter. S-03 sigue a su cargo. P-01…P-10/P-14 de negocio quedan históricos suspendidos |

**Orden posterior a M0 vigente (2026-10-16):** kit local → starter genérico validado/publicado en repo propio → constancia de detención antes de Junie, sin prompt de recepción en StockPilot. El starter requiere ensayo desde copia limpia con contexto de app ficticia distinta, stack/API/DB conectados, tests/E2E y Swagger, sin dependencias del kit ni dominio comercial heredado. Cada proyecto futuro define qué crear en su contexto y deriva su primera tarea; no se promete compatibilidad universal. Sustituye el orden del 2026-10-14; no abre otra tarea/PR ahora.

## Política de revisión del backlog y del alcance
**Revisar resultados y backlog cada cinco tareas de producto mergeadas, al cerrar un hito o ante un cambio relevante, lo que ocurra primero.** El valor de la cadencia puede ajustarlo el dueño con evidencia; se registra aquí como único valor efectivo. No hay scheduler: quien toma la siguiente tarea comprueba primero si toca revisar.

- **Cuenta:** tareas que entregan o corrigen comportamiento del producto, con `counts_for_cycle: true` y el `product_cycle` correspondiente, una vez por ID y con merge confirmado en GitHub. **No cuentan:** M0, PRs solo documentales o de tablero, sesiones, revisiones, reintentos, retomas ni PRs de cierre. No dividir artificialmente una feature para inflar el contador.
- **Disparadores anticipados:** nuevo objetivo pedido por el dueño; cambio de usuarios/permisos, propiedad o aislamiento de datos; contrato incompatible o migración importante; límite de operación/rendimiento observado; fallo repetido de los patrones de base; agotamiento de rondas de revisión o intentos de corrección; dependencia que invalida el siguiente tramo; cola sin trabajo listo.
- **Procedimiento:** (1) consultar Git/PR/CI y reconciliar cierres, preservando el trabajo en vuelo; (2) comparar entregas con la aceptación del hito, distinguiendo integrado, aceptado y beneficio no observado; revisar bugs y deuda con evidencia; (3) reordenar, dividir y aclarar dentro del objetivo, con máximo cinco tareas ready; (4) si conviene otro objetivo, preparar una propuesta mínima (problema, inclusiones/exclusiones, aceptación, dependencias, impacto) para decisión del dueño — la visión posterior del contexto no autoriza implementarla; (5) decidir ejecutor: Junie Lite si sigue patrones validados, frontera para cambios fundacionales o bloqueos que excedieron los límites; (6) publicar una revisión breve en el primer commit de la siguiente tarea autorizada, o una tarea de planificación si requiere diseño sustancial; (7) informar objetivo/ciclo, resultados reales, faltantes, próximo tramo y decisión pendiente.
- **Registro:** al completar una revisión, actualizar la tabla «Ciclo de producto» con la fecha real y los IDs/PRs incluidos hasta el último merge comprobado; STATUS muestra el resumen y BACKLOG la cola. Revisiones anteriores se conservan por enlaces a tareas/PRs.
- **Junie Lite mantiene la cola dentro del objetivo aceptado**; un alcance nuevo se propone al dueño; un cambio fundacional se prepara con frontera (GPT-6.1 Sol u Opus 5.5) antes de volver a Junie.
