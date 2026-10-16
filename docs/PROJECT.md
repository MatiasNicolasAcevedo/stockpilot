# StockPilot · Brief operativo

Índice breve derivado de [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) (contexto v1.2). El contexto es la fuente de intención; este brief no lo reemplaza ni repite sus reglas.

**Objetivo vigente desde el 2026-10-16:** terminar la base técnica comprobada (stack conectado, tests unitarios/integración/E2E, FULL/CI y Swagger/OpenAPI utilizable), consolidar kit y extraer/validar/publicar un starter genérico en repo propio. Detener StockPilot antes de iniciar Junie. El dueño informa que el nombre ya existe y retira la continuidad del producto; no se prepara ni implementa el primer flujo comercial. La definición inferior conserva el contexto histórico. [Decisión y alcance de cierre](tasks/T-003-e2e-gate-and-handoff.md#decisión-del-dueño--límite-de-continuidad--2026-10-16).

## Objetivo
Aplicación web multiempresa para pequeños comercios de cualquier rubro: cada comercio administra productos y existencias, incorpora empleados por invitación y registra ventas simples con un único medio de pago, con historial trazable y sin acceso cruzado entre comercios. Proyecto demostrativo de portfolio, uso local/demo ([contexto §1–§2](../PROJECT_CONTEXT.md#1-identificación)).

## Usuarios y permisos
Visitante, usuario autenticado sin pertenencia, Administrador y Empleado **por comercio** (una persona puede tener roles distintos en comercios distintos). Matriz de permisos confirmada en [contexto §3](../PROJECT_CONTEXT.md#3-usuarios-y-acceso). La autorización se comprueba en el servidor en cada petición por identidad, pertenencia, rol y comercio propietario del recurso.

## Flujos del MVP
| Flujo | Resultado | Aceptación |
|---|---|---|
| F-01 | Crear comercio e incorporar empleados por invitación | CA-01, CA-02, CA-03, CA-12 |
| F-02 | Catálogo, stock inicial, entradas y ajustes con motivo | CA-04, CA-05, CA-06, CA-11 |
| F-03 (central) | Venta de uno o varios productos con descuento coherente de stock | CA-07–CA-10, CA-13, CA-18 |
| F-04 | Consultar y anular ventas con restitución trazable | CA-14–CA-17 |

Detalle de pasos, reglas RN-01–RN-23 y criterios CA-01–CA-19 en [contexto §4, §6 y §11](../PROJECT_CONTEXT.md#4-flujos-principales). El dashboard es deseable y simplificable (P-07), no un quinto flujo.

## Límites
Exclusiones del MVP en [contexto §5](../PROJECT_CONTEXT.md#5-alcance-inicial): cobros reales, facturación fiscal, pagos divididos (visión posterior), variantes/lotes, sucursales, proveedores, emails automáticos, imágenes, analítica avanzada y administración global. Cambios de alcance los decide el dueño.

## Operación
Local/demo con Docker Compose (db, server, client). Sin despliegue público, presupuesto ni datos reales autorizados. Datos y ejemplos siempre ficticios. Google OIDC real requiere credenciales del dueño (pendiente externo, ver [HANDOFF](HANDOFF.md)).

## Supuestos y pendientes abiertos
Pendientes no bloqueantes P-01–P-14 en [contexto §11](../PROJECT_CONTEXT.md#pendientes-y-propuestas-no-reabrir-el-mvp-sin-motivo). Se resuelven al especificar el flujo que los necesita, sin ampliar el MVP. Ninguno bloquea M0.

## Referencias
- Arquitectura y decisiones: [ARCHITECTURE.md](ARCHITECTURE.md), [adr/](adr/0001-base-tecnica-y-alineacion-del-scaffold.md).
- Plan y estado: [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md), [STATUS.md](STATUS.md), [HANDOFF.md](HANDOFF.md).
- Operación del repo: [AUTONOMY.md](AUTONOMY.md), [SETUP.md](SETUP.md), [TESTING.md](TESTING.md), [ORCHESTRATION.md](ORCHESTRATION.md).
