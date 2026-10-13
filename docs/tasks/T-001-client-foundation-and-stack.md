---
id: T-001
status: in_progress
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
role: implementer
executor: frontier
pr: null
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
| ID | Criterio | Prueba |
|---|---|---|
| T1-01 | `docker compose up -d --build --wait` levanta db/server/client sanos y el navegador ve la SPA en el origen público | Comando + `curl` del client y de `/api/v1/system/info` vía proxy |
| T1-02 | La SPA muestra el nombre/versión obtenidos del backend; con el server caído muestra un estado de error comprensible | Test de componente con MSW (éxito y error) + comprobación manual en el stack |
| T1-03 | `/api/v1/system/info` responde 200 sin sesión; el resto de `/api/**` sigue en 401 | Slice MockMvc |
| T1-04 | Errores de validación del servidor → ProblemDetail con `errors[]` y el formulario de referencia los muestra junto al campo | Test web backend + test de componente |
| T1-05 | `typecheck`, `lint`, `format:check`, `test:ci` y `build` verdes en contenedor y en CI | `bash scripts/verify.sh --client` y run del PR |
| T1-06 | Rebuild y reinicio del stack conservan datos de desarrollo | Mismo método que T0-08 |

## Checkpoint de implementación
- Sesiones: implementación · Opus 5.5 (`claude-opus-5-5`) · Claude Code (extensión VS Code) · esfuerzo configurado `xhigh` en los settings del usuario (el contrato pide high; no es un modelo menor).
- Hecho: reconciliación de T-000 (MERGED `9f061f5`, CI de `main` verde en el run 38338964430, licencia MIT detectada, TR-04 sin bloqueo); rama creada desde `main` actualizada.
- Pendiente: T1-01…T1-06.
- Rama / PR: `build/T-001-client-foundation-and-stack` / PR draft al primer push.
- Último commit conocido: `9f061f5` (base).
- Publicación: local.
- Próximo comando o acción: commit de tablero, push y PR draft; luego dependencias del client.

## Resultado
Pendiente.
