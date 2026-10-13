# AGENTS.md · client/

Reglas del frontend; complementan el AGENTS.md raíz. Detalle de diseño en docs/ARCHITECTURE.md.

## Estado
Scaffold Vite `react-ts` conservado tal como se generó (React 19.2, Vite 8, TypeScript 6.0, ESLint 10).
La base (Router, MUI/Emotion, TanStack Query, cliente HTTP, pruebas, Dockerfile y servicio Compose) se materializa en T-001
(docs/tasks/T-001-client-foundation-and-stack.md). Hasta entonces, solo los scripts `lint` y `build` del scaffold existen.

## Estructura objetivo
`src/app/` router, providers y tema · `src/features/<feature>/` páginas, componentes, hooks, tipos y tests ·
`src/shared/ui/` componentes reutilizados de verdad · `src/services/http.ts` único cliente HTTP · `src/test/` setup, MSW, factories.

## Reglas
Componentes funcionales `.tsx`; lógica y tipos `.ts`; TypeScript `strict` explícito; sin `any`, casts forzados ni `@ts-ignore`.
Un solo cliente `fetch` centralizado: cookies de sesión, header CSRF, ProblemDetail, respuestas vacías y aborto.
`fetch` no rechaza por 4xx/5xx: el cliente los convierte en errores tipados.
TanStack Query para datos del servidor: keys estables, invalidación tras mutaciones, sin reintentos para 401/403/validación,
cancelar y limpiar cache privada al logout o cambio de comercio activo. No duplicar ese cache en otro store ni persistirlo.
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
