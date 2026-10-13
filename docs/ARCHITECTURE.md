# Arquitectura de StockPilot

Diseño vigente y sus motivos. Las decisiones duraderas tienen ADR en [adr/](adr/); las versiones ejecutables viven en `server/pom.xml`, `client/package*.json`, `docker-compose.yml` y se resumen en [SETUP.md](SETUP.md). Estado de cada pieza: **materializado** (existe y está probado) o **propuesto** (se decide/prueba en la tarea indicada).

## Vista general
Monolito modular Spring Boot (API REST `/api/v1`) + SPA React servida por el contenedor `client`, sobre PostgreSQL. Un único origen público para el navegador: el `client` sirve la SPA y hace de proxy hacia `server` para `/api`, `/oauth2`, `/login/oauth2/code` y `/logout`, de modo que la cookie de sesión y el CSRF funcionan sin CORS.

```text
navegador ──► client (SPA + proxy) ──► server (Spring MVC, Security, JPA) ──► db (PostgreSQL 18.6)
                                           └── Google OIDC (real) / proveedor OIDC local (test/e2e)
```

| Pieza | Estado |
|---|---|
| `db` PostgreSQL 18.6 con volumen persistente y healthcheck | Materializado (T-000) |
| `server` imagen JRE 21, health/readiness, Flyway + `validate` | Materializado (T-000) |
| Seguridad base deny-by-default, 401/403 ProblemDetail, CSRF activo | Materializado (T-000) |
| Identidad local `app_user` (issuer, subject) | Materializado: esquema/repositorio (T-000); alta al iniciar sesión en T-002 |
| `client` (nginx) como origen único con proxy a `server`; SPA con Router, MUI, Query, cliente HTTP y formularios de referencia | Materializado (T-001) |
| Endpoint público de referencia `GET /api/v1/system/info` y ProblemDetail de validación con `errors[]` | Materializado (T-001) |
| Google OIDC + sesión + CSRF para SPA + logout | Propuesto (T-002, con ADR de sesión/CSRF) |
| E2E Playwright con OIDC local y gate FULL | Propuesto (T-003) |

## Backend: módulos por feature
Paquete raíz generado `server.server` (se conserva; renombrarlo no aporta valor de producto). Cada feature agrupa API, caso de uso y persistencia; se separa en `web/`, `application/`, `persistence/` (y `domain/`) cuando crece.

| Módulo | Responsabilidad | Depende de | Flujo |
|---|---|---|---|
| `identity` | Usuario local por `(issuer, subject)`; email/nombre como atributos mutables | — | Todos |
| `security` | Cadena de filtros, OIDC/sesión, CSRF, traducción 401/403 | `identity` | Todos |
| `store` | Comercio, membresías (Administrador/Empleado) y control de acceso por comercio | `identity` | F-01 |
| `invitation` | Invitaciones por enlace: destinatario, un uso, vencimiento | `store` | F-01 |
| `catalog` | Productos simples: código, nombre, precio ARS, activo/inactivo | `store` | F-02 |
| `inventory` | Saldo y movimientos (inicial, entrada, ajuste, venta, restitución) con actor y motivo | `catalog` | F-02–F-04 |
| `sales` | Venta, ítems con precio histórico, medio de pago único, anulación | `inventory`, `catalog` | F-03, F-04 |
| `shared/error` | ProblemDetail transversal, sin lógica de negocio. Materializado: `ApiExceptionHandler` (validación del body → 400 con `errors[{field, message}]` en orden estable; resto de excepciones de MVC como ProblemDetail) | — | Todos |
| `system` | Endpoint público `GET /api/v1/system/info` (`{name, version}`, versión del POM); única excepción anónima de `/api/**` | — | — |

Reglas de límites: sin ciclos; una feature usa a otra a través de su servicio (no de su repositorio). `sales` registra los movimientos de venta/restitución mediante el servicio de `inventory` dentro de la misma transacción (RN-01, RN-08). Los módulos se crean cuando un objetivo aceptado los necesita; esta tabla fija límites, no obliga a crear paquetes vacíos.

## Multiempresa y autorización (RN-11, RN-20, RN-21)
- Toda tabla de negocio lleva `store_id`; las consultas de repositorio reciben el comercio y filtran por él.
- La API se organiza bajo `/api/v1/stores/{storeId}/…`. El comercio activo lo elige el cliente, pero el servidor **nunca** lo confía: en cada petición un componente de acceso resuelve la membresía y el rol del usuario autenticado en ese `storeId` dentro del caso de uso.
- **Propuesto (cerrar en la spec del primer flujo):** no miembro de `storeId` → 403 genérico; recurso inexistente o de otro comercio dentro de un comercio propio → 404, sin revelar existencia (CA-13). Resuelve el pendiente de presentación HTTP del contexto §3.
- Roles: solo `ADMINISTRADOR` y `EMPLEADO`, por membresía. Sin roles globales ni lectura privilegiada de comercios ajenos.

## Datos
- Esquema solo por Flyway (`server/src/main/resources/db/migration`), Hibernate `validate`, `open-in-view=false`.
- Identificadores UUID v7 generados por la aplicación (no enumerables; la autorización sigue siendo obligatoria). Ver [ADR 0001](adr/0001-base-tecnica-y-alineacion-del-scaffold.md).
- Importes: ARS únicamente, `BigDecimal` escala 2 en Java y `NUMERIC(12,2)` en DB; subtotal = cantidad × precio histórico, total = suma de subtotales (RN-05, RN-17, P-08). **Propuesto:** importes como cadena decimal en JSON (`"12500.00"`) para no depender de coma flotante en JavaScript; se confirma en la spec de catálogo.
- Cantidades enteras; saldo nunca negativo, respaldado también por constraint de DB (RN-02, RN-10).
- Instantes `Instant`/`TIMESTAMPTZ` en UTC; JVM con `-Duser.timezone=UTC`. Zona de presentación pendiente (P-05).
- Historial sin borrado: anular y desactivar no eliminan filas (contexto §6).

## Concurrencia e idempotencia (propuesto para la spec de ventas, F-03)
- Stock: decremento atómico condicionado (`UPDATE … SET stock = stock - :q WHERE id = :id AND store_id = :s AND stock >= :q`) o bloqueo pesimista de filas de producto en orden estable; se elige con una prueba de integración concurrente que demuestre CA-09 sin saldo negativo.
- Doble confirmación (P-09): clave de idempotencia generada por el cliente por intento de venta, única por comercio; reintentar devuelve la misma venta.

## Seguridad
- Materializado: todo requiere autenticación salvo `/actuator/health/**` y `GET /api/v1/system/info`; formulario y Basic deshabilitados; rechazos como ProblemDetail (`SecurityExceptionHandler`); CSRF activo; sin usuarios en memoria.
- Propuesto (T-002): OAuth2 Login con Google (scopes `openid profile email`), sesión backend con cookie `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS; CSRF cookie→header para la SPA con renovación tras login/logout; `/api/v1/auth/me` devuelve un DTO sin credenciales; logout POST que invalida la sesión. Proveedor OIDC local solo en perfiles de prueba.

## Frontend
Estructura `src/app`, `src/features/<feature>`, `src/shared/ui`, `src/shared/forms`, `src/services/http.ts`, `src/test`. Material UI con tema único, TanStack Query para datos remotos, React Hook Form + Zod para formularios de negocio, React Router en modo declarativo. Reglas en [client/AGENTS.md](../client/AGENTS.md).

Materializado en T-001:
- `app/`: `App` (BrowserRouter), `AppProviders` (Query + tema + CssBaseline, compartido con las pruebas), `AppRoutes` (shell con rutas hijas y 404), `theme.ts` (tema único, locale `esES`), `queryClient.ts` (reintenta solo red/5xx, hasta 2 veces; nunca 4xx ni respuestas fuera de contrato).
- `services/http.ts`: único cliente `fetch`. `credentials: 'same-origin'`; header CSRF en métodos no seguros mediante un `CsrfTokenResolver` (hoy sin token: el mecanismo lo fija T-002); 4xx/5xx → `ApiError` con `ProblemDetail` (o `null` si el cuerpo no lo es, p. ej. 502 del proxy); red caída → `NetworkError`; cuerpo vacío/no JSON/fuera de esquema → `UnexpectedResponseError`; el aborto se propaga sin envolver. Toda respuesta con cuerpo se valida con un esquema Zod: no hay `any` ni casts en la frontera.
- `shared/ui`: `ErrorAlert` + `errorMessage` (mensajes en español sin detalles técnicos). `shared/forms`: `FormTextField` (TextField controlado por RHF, error accesible por `aria-describedby`) y `applyServerFieldErrors` (vuelca `errors[]` del server junto a cada campo, foco al primero, el resto en `root.server`).
- `features/system`: primera feature de referencia (api + hook de Query + componente con estados cargando/error/éxito).

Operación: el contenedor `client` (target `runtime`) sirve el build con nginx y reenvía `/api/`, `/oauth2/`, `/login/oauth2/code/` y `/logout` a `server:8080` conservando el `Host` del navegador y agregando `X-Forwarded-*`; resuelve `server` por el DNS de Docker en cada petición (sobrevive a la recreación del server). `client-dev` (perfil `dev`) ofrece Vite con HMR y el mismo proxy. Detalle en [SETUP.md](SETUP.md).

## Pruebas y operación
Niveles, gate y políticas en [TESTING.md](TESTING.md); comandos y versiones en [SETUP.md](SETUP.md).

## Decisiones (ADR)
| ADR | Decisión | Estado |
|---|---|---|
| [0001](adr/0001-base-tecnica-y-alineacion-del-scaffold.md) | Base técnica, Java 21 sobre el scaffold, imágenes fijadas, UUID v7, formato y cobertura | Aceptada |
| 0002 | Sesión, cookie y CSRF para la SPA | Pendiente (T-002) |
