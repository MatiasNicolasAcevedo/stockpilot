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
| Identidad local `app_user` (issuer, subject) | Materializado: esquema/repositorio T-000; servicio transaccional y alta/recuperación tras el login OIDC en T-002 (ver Seguridad) |
| `client` (nginx) como origen único con proxy a `server`; SPA con Router, MUI, Query, cliente HTTP y formularios de referencia | Materializado (T-001) |
| Endpoint público de referencia `GET /api/v1/system/info` y ProblemDetail de validación con `errors[]` | Materializado (T-001) |
| Google OIDC + sesión + CSRF para SPA + logout | Materializado en T-002 (backend, proxies, proveedor OIDC local de pruebas y UI de sesión; PR #3 MERGED `512bfd9`, revisión independiente R2 APROBADO). Google real sin probar: pendiente externo del dueño (HANDOFF S-03) |
| E2E Playwright con OIDC local y gate FULL | Materializado en T-003 A/B/C; Swagger en D2. Revisión independiente ronda 1 APROBADO, FULL en clon limpio y CI FULL; PR #4 MERGED `8cbdaab` (2026-10-17), CI FULL de main verde |

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
Contrato [S-001 v1](specs/S-001-auth-google.md) y [ADR 0002](adr/0002-google-oidc-session-csrf-and-proxy.md), materializado en T-002 (A…D; R2 APROBADO y PR #3 MERGED `512bfd9`):
- **Rutas:** health y GET system/info/csrf públicos; inicio `/oauth2/authorization/google` y callback `/login/oauth2/code/google` GET exactos. GET me y GET `/logout` (405) requieren sesión; POST `/logout` exige CSRF. Todo lo demás denegado (incluidas las rutas de documentación salvo el opt-in de [ADR 0003](adr/0003-openapi-swagger-opt-in.md)): una sesión no concede permisos comerciales. Formulario/Basic/Bearer deshabilitados; 401/403 como ProblemDetail sin redirects para API.
- **Identidad y sesión:** OAuth2 Login de Spring (`openid profile email`); tras la validación de Spring, `IdentityService` crea/recupera `app_user` por issuer/subject exactos (concurrencia recuperada por la constraint) y el principal lleva solo el UUID local. Sesión en memoria 30 min, `JSESSIONID` HttpOnly/SameSite=Lax/Secure según origen, cambio de ID al login, fallo del callback invalida la sesión previa; destinos fijos `/` y `/login?error=authentication`. me devuelve id/displayName/email/emailVerified, sin tokens/issuer/subject/roles.
- **CSRF:** `csrf.spa()` con cookie `XSRF-TOKEN` legible y header `X-XSRF-TOKEN` exclusivamente (sin query); GET `/api/v1/auth/csrf` 204 la materializa. Login y logout la renuevan.
- **Origen y proxies:** `APP_PUBLIC_URL` validado fija callback/cookies. nginx y Vite descartan todo `Forwarded`/`X-Forwarded-*` entrante, reconstruyen host/proto/port desde ese origen y for desde el peer, y rechazan Host ajeno; el server usa forwarding `framework`, queda interno y un guard compara el request reconstruido antes de efectos auth (400 seguro). El diagnóstico directo usa forwarding `none`.
- **Perfiles:** `google` (default) exige credenciales sin fallback; `test`/`e2e` registran el proveedor local bajo la registration `google`; perfiles mezclados fallan al arrancar.
- **OpenAPI:** springdoc genera desde el código me/csrf/GET y POST logout con esquemas `sessionCookie` (`JSESSIONID`) y `csrfHeader` (`X-XSRF-TOKEN`) (`security/AuthOpenApi`, anotaciones de `AuthController`). Publicación según [ADR 0003](adr/0003-openapi-swagger-opt-in.md) (T-003 D2): `STOCKPILOT_API_DOCS_ENABLED` (→ `stockpilot.api-docs.enabled`, false por defecto) gobierna springdoc y el permiso; apagado no hay rutas y toda documentación cae en la regla final (401/403). Encendido exige `APP_PUBLIC_URL` HTTP loopback (`ApiDocsAccess`, falla fija al arrancar) y abre solo GET anónimo de `/api/docs/openapi`, `/api/docs/openapi/swagger-config`, `/api/docs/swagger-ui.html` y `/api/docs/swagger-ui/**`, que atraviesan el proxy `/api/` existente sin ampliar nginx/Vite; `servers` es el origen validado y la UI solo envía GET (`persist-authorization` false, sin CSRF de UI ni URL externa). Lo encienden el overlay E2E y `compose.dev-auth.yml`. Pruebas: `ApiDocsAccessTest`, `ApiDocsDisabledIT`, `OpenApiContractIT` (contrato con el interruptor apagado), `ApiDocsEnabledIT` y `e2e/tests/swagger.spec.ts`.

## Frontend
Estructura `src/app`, `src/features/<feature>`, `src/shared/ui`, `src/shared/forms`, `src/services/http.ts`, `src/test`. Material UI con tema único, TanStack Query para datos remotos, React Hook Form + Zod para formularios de negocio, React Router en modo declarativo. Reglas en [client/AGENTS.md](../client/AGENTS.md).

Materializado en T-001:
- `app/`: `App` (BrowserRouter), `AppProviders` (Query + tema + CssBaseline, compartido con las pruebas), `AppRoutes` (shell con rutas hijas y 404), `theme.ts` (tema único, locale `esES`), `queryClient.ts` (reintenta solo red/5xx, hasta 2 veces; nunca 4xx ni respuestas fuera de contrato).
- `services/http.ts`: único cliente `fetch`. `credentials: 'same-origin'`; header CSRF en métodos no seguros mediante un `CsrfTokenResolver` (en T-001 sin token; T-002 lo conecta a la cookie, ver abajo); 4xx/5xx → `ApiError` con `ProblemDetail` (o `null` si el cuerpo no lo es, p. ej. 502 del proxy); red caída → `NetworkError`; cuerpo vacío/no JSON/fuera de esquema → `UnexpectedResponseError`; el aborto se propaga sin envolver. Toda respuesta con cuerpo se valida con un esquema Zod: no hay `any` ni casts en la frontera.
- `shared/ui`: `ErrorAlert` + `errorMessage` (mensajes en español sin detalles técnicos). `shared/forms`: `FormTextField` (TextField controlado por RHF, error accesible por `aria-describedby`) y `applyServerFieldErrors` (vuelca `errors[]` del server junto a cada campo, foco al primero, el resto en `root.server`).
- `features/system`: primera feature de referencia (api + hook de Query + componente con estados cargando/error/éxito).

Materializado en T-002 (sesión):
- `services/csrf.ts` lee la cookie `XSRF-TOKEN` vigente en cada mutación; `services/http.ts` envía su valor en `X-XSRF-TOKEN` solo en mutaciones same-origin y publica cada 401 en `services/sessionEvents.ts` antes de rechazar, sin reintento.
- `features/auth/`: `api.ts` (Zod de me, me 401 = visitante, `renewCsrf`, `withCsrfRenewal` que pide reintento explícito, `logout`), hooks de sesión/CSRF/logout y `AuthSessionProvider`, único intérprete del canal de 401: con usuario es expiración (cancela consultas, elimina la cache Query que no es `['auth', …]` y las mutaciones, mensaje fijo, sin redirección). Logout cancela, limpia, renueva CSRF y navega a `/login`. Si la revalidación trae otra identidad, la cache privada se descarta antes de publicarla. `AppShell` remonta las rutas con key por identidad. `LoginPage` usa un enlace de navegación completa al inicio OIDC.
- Regla para las features de M1: datos privados en queries fuera del prefijo `auth`; mutaciones que invaliden en lugar de escribir la cache (ver BACKLOG).

Operación: el contenedor `client` (target `runtime`) sirve el build con nginx y reenvía `/api/`, `/oauth2/`, `/login/oauth2/code/` y `/logout` a `server:8080` con Host/forwarding reconstruidos desde `APP_PUBLIC_URL` (ver Seguridad); resuelve `server` por el DNS de Docker en cada petición (sobrevive a la recreación del server). `/login` y el resto caen en el fallback de la SPA. `client-dev` (perfil `dev`) ofrece Vite con HMR y la misma frontera. Detalle en [SETUP.md](SETUP.md).

## Pruebas y operación
Niveles, gate y políticas en [TESTING.md](TESTING.md); comandos y versiones en [SETUP.md](SETUP.md).

## Decisiones (ADR)
| ADR | Decisión | Estado |
|---|---|---|
| [0001](adr/0001-base-tecnica-y-alineacion-del-scaffold.md) | Base técnica, Java 21 sobre el scaffold, imágenes fijadas, UUID v7, formato y cobertura | Aceptada |
| [0002](adr/0002-google-oidc-session-csrf-and-proxy.md) | Google OIDC, sesión, cookie/CSRF y frontera del proxy | Aceptada; implementada, revisada en R2 e integrada en T-002 (PR #3 → `512bfd9`) |
| [0003](adr/0003-openapi-swagger-opt-in.md) | OpenAPI/Swagger opt-in loopback y solo GET bajo `/api/docs/` | Aceptada como contrato en D1, implementada en D2 y aceptada sin enmienda en la revisión independiente ronda 1 de T-003 (PR #4 MERGED `8cbdaab`, 2026-10-17) |

## Camino aislado materializado en T-003
El stack ordinario conserva el perfil Google y exige credenciales privadas, sin fallback. T-003 A materializa un runner Chromium/Playwright en contenedor sobre build real/nginx/API/PostgreSQL/proveedor OIDC local con proyecto, red y volumen propios; origen/issuer coherentes en toda la red. La entrada explícita de desarrollo aislado (nginx/Vite) permite login, recarga, restart/rebuild/retoma con datos ficticios estables; Vite verifica HMR real y Windows aplica resolución por proceso cuando corresponde. B aporta cinco casos por viewport (1280/375), C conecta FULL/CI y D2 agrega Swagger desktop. Sin rutas de test productivas ni acceso al volumen ordinario. E revalida desde clon limpio; esta evidencia aislada corresponde a B-01 v2 y no acredita Google real ni el stack ordinario (S-03, acción del dueño). Contrato, división y matriz en [T-003](tasks/T-003-e2e-gate-and-handoff.md).
