# TESTING · Pruebas, gate y CI

## Fase del gate
**Fase actual: `BOOTSTRAP`** (M0, hasta T-003). Las suites exigidas crecen con las capas realmente materializadas; BOOTSTRAP nunca se presenta como gate completo.

| Fase | Suites exigidas | Desde |
|---|---|---|
| BOOTSTRAP | docs-check · backend (`clean verify`: Spotless, unitarios, integración Testcontainers, JaCoCo) · client (typecheck, lint, format:check, tests con cobertura, build) | T-000 (client desde T-001) |
| FULL | docs · backend · client · E2E Playwright (desktop 1280 px y móvil 375 px) | T-003 (cierre de M0 siempre FULL) |

La fase está declarada en `scripts/verify.sh` (`GATE_PHASE`) y en `.github/workflows/ci.yml` (`env.GATE_PHASE`); docs-check exige que coincidan. Cambiarla es un cambio de CI (gate técnico y revisión).

## Gate local: `scripts/verify.sh`
Se ejecuta con Bash (Git Bash/WSL) desde la raíz y despacha contenedores con Compose. Cualquier fallo devuelve exit code distinto de cero y un resumen por suite.

| Comando | Qué ejecuta |
|---|---|
| `bash scripts/verify.sh` | Todas las suites de la fase actual |
| `bash scripts/verify.sh --docs` | docs-check en `node:24.21.0-alpine` (servicio `docs-check`) |
| `bash scripts/verify.sh --server` | Runner `server-tests`: `./mvnw -B -ntp clean verify` |
| `bash scripts/verify.sh --client` | Runner `client-tests` (imagen `verify` de `client/Dockerfile`, reconstruida con `--build`): `npm run verify` = `typecheck` (`tsc -b`, incluye tests) → `lint` (cero warnings) → `format:check` → `test:ci` (Vitest + cobertura v8) → `build` |
| `bash scripts/verify.sh --e2e` | Falla con «suite no materializada» hasta T-003 |
| `bash scripts/verify.sh --fast` | Fase actual sin E2E; solo iteración, nunca autoriza ready/merge |
| `bash scripts/verify.sh --policy <base>` | Muestra la política (DOCS_ONLY o la fase) del diff contra `<base>`, sin ejecutar suites |

**Backend en contenedor (default) y alternativa preaprobada.** `server-tests` monta `./server`, una caché Maven (`stockpilot_m2-cache`) y el socket de Docker, con `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`; Testcontainers crea PostgreSQL hermanos. Comprobado en Docker Desktop/Windows el 2026-10-12. Si en otra máquina no funcionara tras dos configuraciones documentadas (por ejemplo socket montado y override de host), `STOCKPILOT_SERVER_TESTS=host` ejecuta `./mvnw -B -ntp clean verify` en el host con JDK 21 contra el mismo Docker Desktop: mismas suites, Testcontainers, imagen, formato y JaCoCo; `verify.sh` informa qué variante usó. Aplicarla exige registrar motivo en esta sección, en las trampas de SETUP y un ADR breve. Hoy **no** está aplicada.

## Niveles de prueba
| Nivel | Herramientas | Estado | Referencias reales |
|---|---|---|---|
| Backend unitario/slice | JUnit 6, AssertJ, Mockito (agente), MockMvc + Spring Security Test | Materializado | `security/SecurityConfigTest.java`, `system/SystemInfoControllerTest.java` (endpoint público), `shared/error/ApiExceptionHandlerTest.java` (validación con controller de prueba) |
| Backend integración | `@SpringBootTest`/`@DataJpaTest` + Testcontainers `postgres:18.6` | Materializado | `ServerApplicationIT.java`, `identity/AppUserRepositoryIT.java` |
| Front unitario/componente | Vitest (jsdom), Testing Library, user-event, jest-dom, MSW | Materializado (T-001) | `client/src/services/http.test.ts`, `features/system/SystemInfoPanel.test.tsx`, `shared/forms/ReferenceForm.test.tsx`, `app/AppRoutes.test.tsx` |
| Estáticos | Spotless (Java); `tsc -b`, ESLint, Prettier, build (client) | Materializado | — |
| Auth OIDC | `oidcLogin()` en slices; proveedor OIDC local (navikt/mock-oauth2-server, tag fijo) en integración/E2E | Pendiente (T-002/T-003) | — |
| E2E | Playwright en `e2e/`, stack Compose aislado con nombre único y cleanup | Pendiente (T-003) | — |
| Documentación | `scripts/docs-check.mjs` | Materializado | — |

Convenciones backend: `*Test`/`*Tests` corren con Surefire (`test`); `*IT` con Failsafe (`integration-test` + `verify`). `./mvnw test` no demuestra la integración. Cada test usa datos ficticios propios; las pruebas `RANDOM_PORT` limpian explícitamente lo que escriben (el rollback del test no alcanza al servidor).

Convenciones client: `*.test.ts(x)` junto al código; `renderWithProviders` (`src/test/render.tsx`) monta tema, Query y `MemoryRouter` reales con un QueryClient nuevo sin reintentos por test; MSW (`src/test/msw/`) con `onUnhandledFrame: 'error'`, así que una petición sin handler falla el test; datos de `src/test/factories.ts`, siempre ficticios. Consultas por rol/label accesible, no por clases. `tsconfig.test.json` tipa los tests (`tsconfig.app.json` los excluye del bundle). Los formularios de negocio copian el patrón de `shared/forms/ReferenceForm.test.tsx`.

## Políticas de verificación en CI (`verify-required`)
El workflow [`ci.yml`](../.github/workflows/ci.yml) corre en `pull_request` hacia `main` (`opened`, `synchronize`, `reopened`, `ready_for_review`) y en `push` a `main`, con `concurrency` que cancela ejecuciones reemplazadas. El job agregado **`verify-required` siempre se emite** e informa política, base y HEAD.

| Política | Cuándo | Exige |
|---|---|---|
| `DRAFT` | PR en draft | Corre clasificador, docs-check, backend rápido (`spotless:check test`) y client completo; `verify-required` **falla a propósito** para que un verde nunca provenga de la pasada reducida |
| `DOCS_ONLY` | Todos los archivos del diff están en la allowlist y solo fueron agregados/modificados | docs-check verde; suites técnicas (server y client) omitidas y declaradas no aplicables |
| Fase (`BOOTSTRAP`/`FULL`) | Cualquier otro diff, rutas desconocidas, renombres/borrados o error del clasificador | Todas las suites de la fase, verdes |

Allowlist DOCS_ONLY (en `scripts/ci/classify-diff.mjs`): archivos `*.md`, `docs/**` y `LICENSE`. Workflows, scripts, configuración, dependencias, migraciones, código y ejemplos de entorno nunca son documentales. Modificar el clasificador o su allowlist exige el gate técnico. `plantilla/` no forma parte del repo ni del diff. El cierre de M0 y de cualquier ampliación fundacional exige FULL aunque el último diff sea documental.

Eficiencia de la capa gratuita: jobs en paralelo con `timeout-minutes`, caché Maven/npm de `actions/setup-*`, acciones fijadas por SHA, artefactos solo en fallos con retención de 7 días, sin workflows programados ni ejecuciones duplicadas por push de rama. La CI confirma; no se usa para depurar a prueba y error.

## Cobertura
JaCoCo combina unitarios e integración (`target/jacoco-merged.exec`, reporte en `server/target/site/jacoco/`). Medido el 2026-10-12 sobre T-000: 30/36 líneas (83 %), sin ramas. Umbral efectivo en M0: **0** (`jacoco.line.minimum`/`jacoco.branch.minimum` en el POM), porque la app todavía no tiene dominio. Client: cobertura v8 de Vitest (`test:ci`, reporte en `client/coverage/`, excluye `src/test/` y `main.tsx`); medido el 2026-10-13 sobre T-001: 96 % líneas, 90 % ramas; sin umbral en M0, por el mismo motivo. **Desde la primera tarea de M1** se fijan 80 % de líneas y 70 % de ramas para dominio/servicios del backend y hooks/lógica del frontend, y no se reducen. Cobertura no demuestra permisos ni corrección: los criterios de aceptación sí.

## Reglas
- Prohibido borrar/deshabilitar tests, debilitar asserts, bajar umbrales o usar retries para obtener verde.
- Bugfix: demostrar la regresión antes del arreglo. Regla crítica nueva: comprobar que su test falla si falta la regla.
- Deterministas: `Clock` inyectado, datos únicos por test, sin red externa, sin dependencia del orden ni esperas arbitrarias.
- Probar el commit que se entrega; capturar el exit code del proceso real, no de una tubería posterior.

## Trampas conocidas
Ver [SETUP.md · Trampas conocidas](SETUP.md#trampas-conocidas) (TR-01 zona horaria del JVM, TR-03 Testcontainers desde contenedor, TR-05 `target/` compartido, TR-08 latencia del proxy con server detenido, TR-10 capturas headless a 375 px).
