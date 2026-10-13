---
id: T-001
status: in_review
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: [T-000]
branch: build/T-001-client-foundation-and-stack
risk: elevated
role: reviewer
executor: frontier
pr: 2
---
# T-001 · Base client y stack Compose db/server/client

**Desbloqueada:** T-000 mergeada (PR #1, `9f061f5`, confirmado con `gh` el 2026-10-13).

## Objetivo y evidencia
El navegador abre la SPA desde el contenedor `client`, que actúa como origen único con proxy hacia `server`, y la app muestra un dato real obtenido del backend. Quedan establecidos los patrones de frontend (router, tema MUI, Query, cliente HTTP con ProblemDetail/CSRF, formularios RHF+Zod) y sus pruebas de referencia, para que el primer flujo siga patrones existentes.

## Alcance
Incluye:
- Dependencias con versiones exactas y lockfile por npm: `react-router`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers` (el contexto §9 exige formularios de negocio); dev: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`, `prettier`, `eslint-config-prettier`. Comprobar peers/engines; sin `--force` ni `--legacy-peer-deps`.
- `tsconfig` con `strict: true` explícito (TypeScript 6 lo trae por defecto; se declara igual) y typecheck de tests; scripts `typecheck`, `lint` (cero warnings), `format`/`format:check`, `test`, `test:ci` (cobertura, sin `passWithNoTests`), `build`.
- Estructura `src/app` (router, providers, tema), `src/features/system` (o equivalente), `src/shared/ui`, `src/shared/forms`, `src/services/http.ts`, `src/test` (setup, MSW, factories). Reemplazar la página demo del scaffold por un shell de StockPilot en español (comercio activo y sesión llegan en T-002/M1).
- Cliente HTTP único: cookies, header CSRF (lectura del token según el mecanismo que fije T-002; dejar el punto de extensión), ProblemDetail → error tipado, respuestas vacías, aborto.
- Backend: endpoint público de referencia `GET /api/v1/system/info` → `{ "name": "StockPilot", "version": "…" }` con DTO `record`, `permitAll` explícito y test de slice; manejador transversal de validación en `shared/error` que devuelve ProblemDetail con `errors[{field, message}]`, probado con un controller de test.
- Formularios: helper para volcar errores de campo del servidor en RHF y un campo MUI controlado reutilizable, con tests de componente (esquema de prueba, sin inventar una funcionalidad de negocio).
- `client/Dockerfile` (desarrollo con Vite/HMR; build real servido por un servidor estático con proxy para E2E) y `.dockerignore`; servicio `client` en Compose con healthcheck y `depends_on` del server sano; proxy de `/api`, `/oauth2`, `/login/oauth2/code`, `/logout`. Nunca montar `node_modules` del host (binarios de Windows).
- Gate: suite `client` materializada en `verify.sh` y en CI (`setup-node` + caché npm), `verify-required` exige client en BOOTSTRAP. Actualizar SETUP/TESTING/README/ARCHITECTURE/HANDOFF.
No incluye: login, sesión y logout (T-002); E2E/Playwright (T-003); pantallas de negocio (M1).

## Impacto
- Comportamiento: aparece la SPA (shell en español) servida por `client`; el server agrega un único endpoint anónimo de solo lectura. Todo lo demás de `/api/**` sigue en 401 y los POST sin CSRF en 403.
- Contratos: `GET /api/v1/system/info` → `200 {"name","version"}` sin datos sensibles; errores de validación del body → `400 application/problem+json` con `errors[{field, message}]` (las demás excepciones estándar de MVC siguen como ProblemDetail). Sin cambios de esquema ni rutas existentes.
- Permisos/propiedad: `permitAll` explícito solo para `GET /api/v1/system/info`; ninguna otra excepción a deny-by-default. CSRF intacto; el cliente deja el punto de extensión para el token (mecanismo en T-002).
- Datos: sin migraciones; el volumen de desarrollo no cambia. El client no persiste nada en el navegador.
- UI y operación: se reemplaza la demo del scaffold; nuevo servicio Compose `client` (origen público en loopback) con proxy a `server`; nueva suite `client` en `verify.sh` y CI (`verify-required` la exige en BOOTSTRAP). Documentación: SETUP, TESTING, README, ARCHITECTURE, HANDOFF, client/AGENTS.

## Leer antes
[client/AGENTS.md](../../client/AGENTS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) (Vista general, Frontend) · [TESTING.md](../TESTING.md) · [SETUP.md](../SETUP.md) (trampas) · PROJECT_CONTEXT §7.

## Aceptación y pruebas
| ID | Criterio | Prueba | Resultado real (2026-10-13) |
|---|---|---|---|
| T1-01 | `docker compose up -d --build --wait` levanta db/server/client sanos y el navegador ve la SPA en el origen público | Comando + `curl` del client y de `/api/v1/system/info` vía proxy | Verificado: db/server/client healthy; `curl` a http://127.0.0.1:5173 → 200 `text/html` (`lang="es"`, título StockPilot), ruta profunda → 200 (fallback SPA), assets con cache inmutable; vía proxy `GET /api/v1/system/info` → 200 `{"name":"StockPilot","version":"0.0.1-SNAPSHOT"}`, `/api/v1/stores` → 401 y `POST` sin CSRF → 403 (`application/problem+json`); `/oauth2/…` y `/logout` llegan al server. SPA renderizada en Edge headless (CDP) a 1280 y 375 px sin scroll horizontal |
| T1-02 | La SPA muestra el nombre/versión obtenidos del backend; con el server caído muestra un estado de error comprensible | Test de componente con MSW (éxito y error) + comprobación manual en el stack | Verificado: `SystemInfoPanel.test.tsx` (éxito, 502 del proxy, red caída + «Reintentar») y `AppRoutes.test.tsx`. En el stack: `docker compose stop server` → proxy 502 en ~1 s (TR-08) y la SPA muestra «No se pudo obtener el estado del servidor · El servidor no está disponible en este momento…» con «Reintentar» (captura a 375 px) |
| T1-03 | `/api/v1/system/info` responde 200 sin sesión; el resto de `/api/**` sigue en 401 | Slice MockMvc | Verificado: `SystemInfoControllerTest` (GET anónimo 200 con versión filtrada del POM; POST → 401; `/api/v1/system/info/extra`, `/api/v1/system`, `/api/v1/stores` → 401 ProblemDetail) + `SecurityConfigTest` sin cambios |
| T1-04 | Errores de validación del servidor → ProblemDetail con `errors[]` y el formulario de referencia los muestra junto al campo | Test web backend + test de componente | Verificado: `ApiExceptionHandlerTest` (400 `application/problem+json` con `errors` ordenado; body válido no afectado; JSON mal formado sigue como ProblemDetail sin `errors`) + `ReferenceForm.test.tsx` (validación Zod sin request; errores del server como descripción accesible del campo, `aria-invalid` y foco al primero; campo desconocido en alerta general; 500 sin filtrar detalle; éxito solo tras 204). Mutación de control: anular `applyServerFieldErrors` hace fallar el test |
| T1-05 | `typecheck`, `lint`, `format:check`, `test:ci` y `build` verdes en contenedor y en CI | `bash scripts/verify.sh --client` y run del PR | Verificado en contenedor: `verify.sh --client` exit 0 (34 tests en 6 archivos, cobertura 96 % líneas / 90 % ramas; build OK). CI del PR #2 (draft, run 38341806558 sobre `742d5c6`): job `client` verde. El run ready sobre el HEAD final queda en el comentario de evidencia del PR |
| T1-06 | Rebuild y reinicio del stack conservan datos de desarrollo | Mismo método que T0-08 | Verificado: `flyway_schema_history.installed_on` = `2026-10-13 02:18:22.27758` sin cambios tras `up --build --force-recreate`, `restart`, `down`/`up` y recreación del server sin reiniciar el client (que siguió respondiendo 200 vía proxy) |

Política de gate: BOOTSTRAP (docs + server + client). Gate completo local: `bash scripts/verify.sh` sobre `742d5c6` → exit 0 (docs OK; server BUILD SUCCESS 9 slice + 7 IT; client OK).

## Checkpoint de implementación
- Sesiones: implementación · Opus 5.5 (`claude-opus-5-5`) · Claude Code (extensión VS Code) · esfuerzo configurado `xhigh` en los settings del usuario (el contrato pide high; no es un modelo menor).
- Hecho: reconciliación de T-000 (MERGED `9f061f5`, CI de `main` verde en el run 38338964430, licencia MIT detectada, TR-04 sin bloqueo); T1-01…T1-06 implementados y verificados; documentación (SETUP, TESTING, README, ARCHITECTURE, HANDOFF B-01/B-03/V-01, client/AGENTS, client/README).
- Pendiente: revisión en sesión distinta (recomendado GPT-6.1 Sol / Codex) y merge elegible.
- Decisiones y supuestos:
  - El servicio `client` por defecto usa el target `runtime` (build real en nginx 1.30.5): es el mismo artefacto que usará E2E (T-003). Vite con HMR queda en `client-dev` (perfil `dev`, puerto 5174), con polling por los bind mounts de Windows (TR-09).
  - nginx resuelve `server` por el DNS de Docker en cada petición (`resolver` + `proxy_pass` por variable, `resolver_timeout 1s`): sobrevive a la recreación del server y falla rápido si está detenido (TR-08). Conserva el `Host` del navegador y agrega `X-Forwarded-*`; la configuración de forwarded headers del server queda para T-002 (BACKLOG).
  - Cliente HTTP como fábrica (`createHttpClient`) con esquema Zod obligatorio para respuestas con cuerpo; la instancia `http` no envía CSRF hasta que T-002 configure el `CsrfTokenResolver`. Solo `GET` se considera método seguro (no se exponen HEAD/OPTIONS).
  - `ApiExceptionHandler` extiende `ResponseEntityExceptionHandler`, por lo que reemplaza al manejador ProblemDetail por defecto de Boot; solo vuelca errores de campo (los errores globales de objeto se agregan cuando una spec los necesite). Los mensajes salen de la constraint: los DTO de negocio declaran mensajes en español.
  - Versión del endpoint: `@project.version@` filtrado por `spring-boot-starter-parent` en `application.yaml` (`stockpilot.version`).
  - Dependencias nuevas con versión exacta; los rangos del scaffold se conservan (exactos en el lockfile). Markdown excluido de Prettier (lo valida docs-check). `tsconfig.test.json` tipa los tests; `tsconfig.app.json` los excluye. Cobertura client sin umbral en M0, igual que JaCoCo.
  - docs-check exige la misma versión de Node en `ci.yml`, Compose y `client/Dockerfile` (probado con una discrepancia controlada → exit 1).
- Archivos propios y cambios heredados: todo el diff es de esta tarea; se eliminaron los archivos demo del scaffold (`App.tsx`, `App.css`, `index.css`, `assets/*`, `public/icons.svg`) y se reemplazó el favicon.
- Pruebas: ver tabla. Comandos del 2026-10-13: `docker compose --profile verify run --rm server-tests ./mvnw -B -ntp spotless:apply test` (9 tests), `npm run test:ci` en el host (34), `bash scripts/verify.sh --client`, `bash scripts/verify.sh` (exit 0), `docker compose up -d --build --wait` + `curl`, capturas CDP, HMR de `client-dev` con un cambio real (DOM actualizado sin recarga, archivo restaurado).
- Fuera de alcance (a BACKLOG): bundle de 539 kB (aviso de Vite > 500 kB; code-splitting por ruta cuando haya pantallas); forwarded headers del server para OIDC detrás del proxy (T-002).
- Bloqueos: ninguno.
- Rama / PR: `build/T-001-client-foundation-and-stack` / [#2](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/2).
- Último commit conocido: `742d5c6` (código); el commit de cierre documental cambia el HEAD y su SHA queda en el comentario de evidencia del PR.
- Publicación: publicada en el PR #2 (ready al publicar el cierre).
- Próximo comando o acción: sesión revisora con el prompt de docs/STATUS.md.

## Resultado
Implementación publicada en el PR #2, en revisión. Criterios T1-01…T1-06 verificados localmente y en contenedores; CI del HEAD final en el PR. Descubrimientos: TR-08 (latencia DNS del proxy con server detenido), TR-09 (HMR con bind mounts de Windows) y TR-10 (ancho mínimo de capturas headless), documentados en SETUP; dos pendientes al BACKLOG.
