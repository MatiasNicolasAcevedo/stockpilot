# AGENTS.md · client/

Reglas del frontend; complementan el AGENTS.md raíz. Detalle de diseño en docs/ARCHITECTURE.md.

## Estado y comandos
Base materializada en T-001 sobre el scaffold Vite `react-ts` (React 19, Vite 8, TypeScript 6, ESLint 10); versiones en docs/SETUP.md.
Gate client: `bash scripts/verify.sh --client` desde la raíz (runner client-tests). Equivale a `npm run verify`:
`typecheck` (`tsc -b`, incluye tests) · `lint` (cero warnings) · `format:check` · `test:ci` (cobertura) · `build`.
Iteración en el host: `npm ci`, `npm test`, `npm run format`. Dependencias nuevas solo con `npm install --save-exact`.
Stack: `docker compose up -d --build --wait` → http://127.0.0.1:5173 exige `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` reales en `.env`
(perfil `google`, sin fallback; no leerlos ni imprimirlos); HMR opcional con el perfil `dev` (docs/SETUP.md).
Sin credenciales: gate client y `node scripts/test-auth-ui-smoke.mjs [--vite]` (stack aislado con proveedor OIDC local).
Proxy de `/api/`, `/oauth2/`, `/login/oauth2/code/`, `/logout`: mantener iguales `nginx.conf` y `vite.config.ts`.

## Estructura
`src/app/` router, providers y tema · `src/features/<feature>/` páginas, componentes, hooks, tipos y tests ·
`src/shared/ui/` componentes reutilizados de verdad · `src/shared/forms/` campo RHF y errores del servidor ·
`src/services/http.ts` único cliente HTTP · `src/test/` setup, MSW, factories, `renderWithProviders`.
Referencias: `features/system/` (api con esquema Zod + hook de Query + componente con estados) y
`shared/forms/ReferenceForm.test.tsx` (formulario RHF + Zod con errores del servidor junto al campo).

## Reglas
Componentes funcionales `.tsx`; lógica y tipos `.ts`; TypeScript `strict` explícito; sin `any`, casts forzados ni `@ts-ignore`.
Un solo cliente `fetch` centralizado: cookies de sesión, header CSRF, ProblemDetail, respuestas vacías y aborto.
`fetch` no rechaza por 4xx/5xx: el cliente los convierte en errores tipados.
TanStack Query para datos del servidor: keys estables, invalidación tras mutaciones, sin reintentos para 401/403/validación,
cancelar y limpiar cache privada al logout o cambio de comercio activo. No duplicar ese cache en otro store ni persistirlo.
Datos privados en query keys fuera del prefijo `['auth', …]` (el logout/expiración conserva solo ese prefijo).
Mutaciones de negocio invalidan queries en lugar de escribir la cache (`setQueryData`): una mutación en vuelo no se
cancela al cerrar sesión; las primeras de M1 agregan una prueba de logout en vuelo (docs/BACKLOG.md).
Formularios de negocio con React Hook Form + Zod + resolvers; errores de campo de cliente y servidor junto al campo.
Material UI con un tema único; labels y roles accesibles, foco tras errores, uso por teclado y layout usable a 375 px.
Estados explícitos: cargando, vacío, error de red/servidor, validación, éxito y sin permiso; nunca éxito si no se guardó.
Importes en ARS con dos decimales e `Intl.NumberFormat('es-AR')`; cantidades enteras; textos de UI en español.
La UI no decide permisos: oculta acciones por UX, pero el servidor autoriza siempre.
No guardar secretos ni tokens en el bundle, localStorage o sessionStorage. Variables `VITE_*` son públicas.
Comercio activo y rol visibles; cambiar de comercio no mezcla datos de vistas anteriores.

## Pruebas
Vitest + Testing Library + user-event + jest-dom; MSW para la API en tests de componentes, sin requests no manejados.
Tests con providers reales (router, tema, QueryClient aislado sin reintentos). Typecheck incluye los tests.
Playwright vive en `e2e/` (T-003) contra el stack real; no se mockea la API propia allí.
