# ROADMAP

Hitos por resultados y dependencias, sin fechas inventadas. Intención y aceptación del producto: [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md). Cola y estado de tareas: [BACKLOG.md](BACKLOG.md).

## Hitos
| Hito | Objetivo | Criterio de salida | Ejecutor | Estado |
|---|---|---|---|---|
| M0 · Base verificable | Conservar scaffolds y dejar la base lista para Junie Lite | Contexto trazado; arquitectura y Google OIDC (local) probados; unitarios/typecheck/integración; Playwright con OIDC local; CI requerida; HANDOFF con 21 criterios verificados y merges confirmados | Frontera | En curso (T-000) |
| M1 · Primer flujo útil | Una funcionalidad vertical completa (ciclo C1) | Criterios de su spec cumplidos, persistencia, UI con estados/errores, E2E desktop/móvil, umbrales de cobertura activos | Junie Lite | Propuesto |
| M2 · MVP | Los cuatro flujos F-01–F-04 del contexto | CA-01–CA-19 cubiertos con pruebas, permisos y aislamiento probados, demo con datos ficticios y README probado | Junie Lite (frontera para lo fundacional) | Propuesto |
| M3 · Mantenimiento | Cambios pequeños y calidad sostenible | Regresiones cubiertas, dependencias atendidas por riesgo, backlog sin bloqueos olvidados, gate verde | Junie Lite | Futuro |

### M0 en cuatro tareas/PRs de frontera
| Tarea | Resultado | Depende de |
|---|---|---|
| [T-000](tasks/T-000-governance-and-server-foundation.md) | Gobierno, repo/ruleset, CI BOOTSTRAP + base server PostgreSQL/Flyway/Testcontainers | Scaffolds y credenciales Git |
| [T-001](tasks/T-001-client-foundation-and-stack.md) | Base client y stack Compose db/server/client con llamada real | T-000 |
| [T-002](tasks/T-002-google-auth.md) | Google OIDC, sesión, CSRF, identidad local y permisos base | T-001 |
| [T-003](tasks/T-003-e2e-gate-and-handoff.md) | E2E + gate FULL + CI requerida + spec del primer flujo + traspaso | T-002 |

El dashboard (P-07) y las mejoras visuales se ordenan después de los flujos principales y no los retrasan.

## Ciclo de producto
| Campo | Valor |
|---|---|
| Ciclo/hito actual | Ninguno de producto todavía: M0 es preparación y no cuenta para el ciclo |
| Primer ciclo propuesto | **C1 · M1 — Alta de comercio y comercio activo** (F-01 parcial): crear comercio y quedar como Administrador (CA-01, RN-18), listar y seleccionar comercios propios con rol por comercio (RN-11, RN-21) y denegar acceso a no miembros (CA-13 y CA-19 en lo aplicable). Ordenado por el contexto §5 («identificar comercio y miembros» primero). Se confirma al redactar su spec en T-003; invitaciones, catálogo, inventario, ventas y anulación siguen en M2 |
| Alcance y salida | Se fija en la spec del primer flujo (T-003) |
| Cadencia efectiva | 5 tareas de producto mergeadas (`counts_for_cycle: true`), además del cierre de hito o un disparador anticipado, lo que ocurra primero |
| Último corte revisado | Ninguno (sin tareas de producto mergeadas) |
| Balance de la revisión | — |
| Próximo tramo | Completar M0 (T-000 → T-003) |
| Decisiones pendientes | P-01–P-10 y P-14 del contexto se resuelven al especificar el flujo que los necesita; ninguna bloquea M0 |

## Política de revisión del backlog y del alcance
**Revisar resultados y backlog cada cinco tareas de producto mergeadas, al cerrar un hito o ante un cambio relevante, lo que ocurra primero.** El valor de la cadencia puede ajustarlo el dueño con evidencia; se registra aquí como único valor efectivo. No hay scheduler: quien toma la siguiente tarea comprueba primero si toca revisar.

- **Cuenta:** tareas que entregan o corrigen comportamiento del producto, con `counts_for_cycle: true` y el `product_cycle` correspondiente, una vez por ID y con merge confirmado en GitHub. **No cuentan:** M0, PRs solo documentales o de tablero, sesiones, revisiones, reintentos, retomas ni PRs de cierre. No dividir artificialmente una feature para inflar el contador.
- **Disparadores anticipados:** nuevo objetivo pedido por el dueño; cambio de usuarios/permisos, propiedad o aislamiento de datos; contrato incompatible o migración importante; límite de operación/rendimiento observado; fallo repetido de los patrones de base; agotamiento de rondas de revisión o intentos de corrección; dependencia que invalida el siguiente tramo; cola sin trabajo listo.
- **Procedimiento:** (1) consultar Git/PR/CI y reconciliar cierres, preservando el trabajo en vuelo; (2) comparar entregas con la aceptación del hito, distinguiendo integrado, aceptado y beneficio no observado; revisar bugs y deuda con evidencia; (3) reordenar, dividir y aclarar dentro del objetivo, con máximo cinco tareas ready; (4) si conviene otro objetivo, preparar una propuesta mínima (problema, inclusiones/exclusiones, aceptación, dependencias, impacto) para decisión del dueño — la visión posterior del contexto no autoriza implementarla; (5) decidir ejecutor: Junie Lite si sigue patrones validados, frontera para cambios fundacionales o bloqueos que excedieron los límites; (6) publicar una revisión breve en el primer commit de la siguiente tarea autorizada, o una tarea de planificación si requiere diseño sustancial; (7) informar objetivo/ciclo, resultados reales, faltantes, próximo tramo y decisión pendiente.
- **Registro:** al completar una revisión, actualizar la tabla «Ciclo de producto» con la fecha real y los IDs/PRs incluidos hasta el último merge comprobado; STATUS muestra el resumen y BACKLOG la cola. Revisiones anteriores se conservan por enlaces a tareas/PRs.
- **Junie Lite mantiene la cola dentro del objetivo aceptado**; un alcance nuevo se propone al dueño; un cambio fundacional se prepara con frontera (GPT-6.1 Sol u Opus 5.5) antes de volver a Junie.
