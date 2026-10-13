---
id: T-002
status: ready
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: S-001
spec_version: 1
depends_on: [T-001]
branch: feat/T-002-google-auth
risk: elevated
role: implementer
executor: frontier
pr: null
---
# T-002 · Google OIDC, sesión, CSRF e identidad local

## Checkpoint de planificación · inicio · 2026-10-13
- Rol real: planner de frontera; herramienta Codex (API); modelo declarado GPT-6. El identificador runtime exacto y el esfuerzo real no están expuestos/verificables. GPT-6.1 Sol / high es la recomendación del dueño, no telemetría de esta sesión. No se lanzó otra sesión/modelo.
- Inicio desde la raíz, árbol limpio sin cambios heredados. PR #2 confirmado MERGED mediante gh: HEAD aprobado `b1cfff045d6a918ea8dc18d60451ef447e1a7a74`, base `9f061f55f99e614e36f8317150881ed9408a8c96`, squash `84d103cd4c6b1c58f45f6272354ef49c918bce06`, fecha `2026-10-13T18:06:01Z`. Veredicto ronda 2 y CI del HEAD/main verdes; ningún PR abierto. Nueva rama exacta `feat/T-002-google-auth` desde ese main.
- Impacto antes de editar: reconciliación documental de T-001 done y planificación de T-002; se fijarán contratos de identidad/OIDC/sesión/CSRF y frontera del proxy. Sin código, permisos ejecutables, migraciones, datos ni UI implementados. AUTONOMY y protecciones intactas. HANDOFF sigue NO_LISTO, 7/21; BOOTSTRAP no es FULL.
- Próxima acción: publicar spec S-001 y ADR 0002, partes secuenciales, revisión de ciclo y transición conjunta tarea/STATUS/BACKLOG; ejecutar docs-check en contenedor antes de commit. Logs de validación en `$TEMP/stockpilot-T002-planner-docs.log`; cleanup pendiente: ninguno, no se opera el stack de desarrollo.

## Objetivo y evidencia
Visitante inicia Google OIDC, obtiene sesión backend y consulta identidad local; logout invalida sesión y limpia cache. Dependencia T-001 done confirmada por gh. Contrato [S-001 v1](../specs/S-001-auth-google.md) aprobado como planificación alineada al brief, [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md) aceptada como contrato; código/pruebas pendientes. Próximo ejecutor implementer de frontera en sesión nueva.

## Alcance
Incluye identidad local transaccional, OIDC/sesión/cookies/CSRF, DTO me, logout, UI de sesión, perfil de proveedor local aislado, forwarded headers/frontera del proxy, pruebas reforzadas y guía Google/entorno/OpenAPI. Variables reales solo backend y nunca leídas/publicadas por el agente. Contratos/status exactos en S-001; no cambiar aceptación para acomodar un framework.

No incluye membresías/comercios, roles globales, auth propia/tokens de navegador, Playwright/gate FULL (T-003), producción, credenciales/datos reales ni CI nueva. Smoke Google real queda externo con dueño si no hay credenciales.

## Impacto de implementación previsto
- Comportamiento: login/recarga/logout con sesión en memoria; reinicio del server termina sesión. API privada sin sesión sigue en 401 JSON; CSRF inválido 403; POST logout 204.
- Contratos: GET me/csrf y rutas OIDC exactas, cookie/header CSRF y origen público fijo; sin CORS ni tokens OIDC en JSON/browser. OpenAPI y guía se actualizan con código real.
- Permisos/propiedad: identidad no concede rol/membresía; deny-by-default, proveedor mock solo test/e2e y saneamiento de headers en ambos proxies. Server interno ordinario; diagnóstico directo separado sin forwarding.
- Datos: actualizar app_user por issuer/subject con constraint V1; sin migración prevista, conservar volumen. Cualquier necesidad de migración se justifica antes de editar, dentro de tarea explícita y sin cambiar V1.
- UI: entrada/error/cancelación, usuario actual y logout accesible; limpiar consultas/cache privada al salir/401. No crear selector/comercio ficticio.

## Leer antes
[S-001](../specs/S-001-auth-google.md) · [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md) · [ARCHITECTURE seguridad](../ARCHITECTURE.md#seguridad) · [TESTING](../TESTING.md) · [SETUP trampas](../SETUP.md#trampas-conocidas). Además AGENTS raíz/server/client y protocolo implementer según archivos a editar.

## División antes de implementar
Tarea L de M0 conservada por excepción explícita del planner (las cuatro tareas de preparación son mayores por diseño). Partes pequeñas secuenciales con una salida verificable, checkpoints y misma rama/PR; no cuentan para ciclo, no crean IDs artificiales ni consumen T-004 del primer flujo. No intentar completar todas en una sola sesión si compromete evidencia/contexto.

| Parte | Dependencia | Salida comprobable / límite | Archivos previstos (código y tests) |
|---|---|---|---|
| A · identidad | contrato y T-001 | Alta/recuperación/update por identidad estable, atributos opcionales, conflicto concurrente probado; sin abrir rutas todavía | `identity/AppUser`, repositorio, servicio de identidad; `IdentityServiceTest`, `IdentityServiceIT` |
| B1 · seguridad HTTP | A | OIDC Google, principal local, me/csrf, cookie/CSRF/logout, destinos fijos y perfiles sin fallback; slices verdes | `security/SecurityConfig`, configuración/servicio OIDC, handlers; `identity`/`security` DTO/controller auth, propiedades de perfiles; `AuthControllerTest`, `SecurityConfigTest`, `OidcProfileTest` |
| B2 · proxy y proveedor | B1 | Mock de versión exacta aislado, issuer alcanzable por ambos lados; origin fijo, forwarding saneado nginx/Vite, server interno/diagnóstico explícito | Compose base/override de pruebas, fixtures OIDC, nginx/template de runtime, Vite, configuración public origin; `PublicOriginIT` y comprobación de proxies |
| B3 · protocolo real | B2 | Callback/session/me/logout por HTTP y todos los negativos AC-02/04/05/06/08, sin oidcLogin para protocolo | `OidcLoginIT`, fixtures test de tokens/respuestas/proveedor; configuración test/resources |
| C1 · transporte client | B3 | Obtener/renovar CSRF y validar me con Zod; token leído por petición y 401 sin retries | `services/http`, resolver CSRF y tests; `features/auth/api`, hooks/tests |
| C2 · UI sesión/cache | C1 | Entrada, fallo/cancelación, recarga y logout; cancelación de requests y limpieza cache entre dos usuarios | `features/auth` UI/provider/tests, `app/AppRoutes`/shell/queryClient y tests |
| D · aceptación/documentación | C2 | Gate BOOTSTRAP local, smoke navegador 375/1280 y proxy, guía Google/OpenAPI/HANDOFF reales; transición conjunta a in_review | `.env.example` ficticio, SETUP/TESTING/ARCHITECTURE/HANDOFF, tarea/STATUS/BACKLOG; spec solo si aclaración compatible trazada |

B1/B2 son configuración/seguridad explícitas de esta tarea con pruebas reforzadas. Antes de cada parte revisar impacto y archivos efectivos; si excede salida manejable, checkpoint publicado y sesión nueva para esa misma parte. No dividir aceptación ni rebajar negativos. Máximo un PR activo y dos rondas de revisión para la implementación final; esta planificación no es tercera revisión de T-001.

## Pasos
1. Sesión implementer nueva toma solo parte A, registra identidad real e impacto y transición in_progress con docs-check.
2. Demostrar conducta de identidad con pruebas unitarias y PostgreSQL; publicar checkpoint en esta rama/PR. Continuar partes dependientes solo después de salida verde, registrando qué aún falta.
3. Antes de pruebas largas guardar comando/log/cleanup; tests usan stack/proyectos aislados y datos ficticios. Al publicar ready/in_review exigir gate completo de la fase BOOTSTRAP, no usar CI para depurar.
4. Al completar D, revisión independiente sobre HEAD publicado/base comprobada. No afirmar done/FULL ni merge con PR abierto. S-03 real externo explícito; dueño abre sesiones, sin dispatcher.

## Aceptación y pruebas
La matriz completa AC-01…AC-10, actor permitido/denegado y archivos está en S-001 v1. No hay criterios ejecutables acreditados por esta sesión planner.

| Criterio | Prueba requerida | Resultado esperado | Evidencia real |
|---|---|---|---|
| AC-01 | Unitarios + PostgreSQL identidad/concurrencia | ID estable, atributos mutables, sin fusión por email ni duplicados | pendiente A |
| AC-02…AC-08 | Slices + protocolo OIDC + proxies/perfiles | Login/session/cookies, rechazos/CSRF/logout y origen confiable | pendiente B1…B3 |
| AC-09 | Client unit/component + navegador real | UI accesible, 401/cache, logout y renovación CSRF | pendiente C1/C2/D |
| AC-10 | `bash scripts/verify.sh` + CI mismo HEAD y guía | BOOTSTRAP verde; smoke Google separado como probado o externo | pendiente D |
| Planificación | `bash scripts/verify.sh --docs` | tarea/STATUS/BACKLOG, enlaces y HANDOFF coherentes | 2026-10-13, exit 0: 36 Markdown/4 tareas, HANDOFF 7/21; revalidar cierre antes de cada commit |

Política de este diff: documental; docs-check containerizado antes de push. Implementación: BOOTSTRAP técnico obligatorio y pruebas reforzadas, nunca FULL hasta T-003. PR draft falla verify-required a propósito según TESTING; no cuenta como listo para merge.

## Checkpoint de planificación · salida · 2026-10-13
- Hecho: cierre remoto T-001 reconciliado, S-001 v1/ADR 0002 y división secuencial; revisión anticipada de ROADMAP por cola sin ready/cambio fundacional de identidad, sin cambiar objetivo ni autonomía. T-002 ready; T-003 draft.
- Cambios propios: documentos de tarea/STATUS/BACKLOG/HANDOFF/ROADMAP/ARCHITECTURE, spec y ADR. Heredados: ninguno; código y entorno no modificados, sin lectura de secretos. Kit local mejorado con dos lecciones genéricas de planificación/frontera de proxy, sin datos del producto, excluido del commit.
- Publicación: primer commit de esta rama reconcilia T-001; PR draft al primer push útil. SHA final/CI y número real de PR se registran después sin SHA autorreferencial.
- Pruebas reales: `bash scripts/verify.sh --docs` containerizado exit 0 (36 Markdown, 4 tareas, HANDOFF 7/21), 2026-10-13. Dos invocaciones restringidas fallaron antes del runner por utilidades Git Bash inaccesibles (dirname/sh); ejecución elevada autorizada pasó sin cambiar scripts ni aceptación. `git diff --check` verde. No se ejecutó gate técnico ni se afirma auth materializada. Log `$TEMP/stockpilot-T002-planner-docs.log`; sin cleanup pendiente.
- Bloqueos: ninguno para parte A. Pull/configuración/red del proveedor pendientes B2; Google real con dueño, Junie Lite pendiente E-01. Modelo declarado GPT-6/Codex API, exacto/esfuerzo no verificables, sin atribuir high solicitado.
- Último commit conocido al planificar: base `84d103cd4c6b1c58f45f6272354ef49c918bce06`.
- Próxima acción: nueva sesión implementer de frontera, misma T-002/rama/PR, parte A; prompt único y completo en STATUS. No se implementa código en esta sesión.

## Resultado
Contrato refinado v1 y dependencia cumplida: ready para parte A en sesión implementer nueva. Planificación no equivale a autenticación implementada ni a aprobación de PR. T-002 permanece abierta hasta entrega/revisión/merge; M0 NO_LISTO, 7/21, BOOTSTRAP.
