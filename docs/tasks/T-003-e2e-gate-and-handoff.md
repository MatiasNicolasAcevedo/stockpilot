---
id: T-003
status: in_progress
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: [T-002]
branch: ci/T-003-e2e-gate-and-handoff
risk: elevated
role: implementer
executor: frontier
pr: 4
---
# T-003 · E2E, gate FULL, CI requerida y traspaso

## Checkpoint de planificación · inicio · 2026-10-14
- Planner de frontera en sesión nueva desde la raíz. Codex API basado en GPT-6 según la identidad declarada del entorno; identificador runtime exacto y esfuerzo efectivo no expuestos/verificables. GPT-6.1 Sol/high recomendados no se simulan; sin otra sesión/modelo ni delegación.
- Inicio limpio, sin cambios heredados. HEAD local/main/remoto `512bfd9c6b143aa484ddce72aad64bb9484e6330`; PR #3 MERGED el `2026-10-14T03:51:50Z`, squash del HEAD aprobado `a64d29cc883d0292e3910a079d1089e6c21cf2c3` contra base `84d103cd4c6b1c58f45f6272354ef49c918bce06`. R2 probó código `cac090be87a2337889758fc4f809d945ba0f1a99`; [veredicto](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3#issuecomment-6160479927) y [cierre](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/3#issuecomment-6160511394) comprobados con gh. CI HEAD 38507675463 y main 38508440122 SUCCESS BOOTSTRAP; ningún PR abierto. No tercera ronda ni commits en rama T-002.
- Impacto antes de editar: reconciliación documental de T-002 done, HANDOFF y arquitectura en el primer commit de esta rama; contrato técnico y división de T-003, revisión de ciclo y prompt de retoma. Sin cambios de conducta ejecutable, contratos API vigentes, permisos/propiedad, datos/migraciones, UI, CI, AUTONOMY o protecciones. PROJECT_CONTEXT leído: no cambia intención ni requiere revisión de §12.
- M0 NO_LISTO 9/21, BOOTSTRAP no FULL, Junie no habilitada. B-01 ordinario y S-03 Google real pendientes del dueño; disponibilidad Junie E-01 también externa.
- Próxima acción: refinar partes y matriz de aceptación; docs-check conjunto en contenedor, diff, commit explícito/push y PR draft. Logs `$TEMP/stockpilot-T003-planner-docs.log`; cleanup solo red del proyecto documental `stockpilot-t003-planner-docs`, sin operar stack ordinario ni datos persistentes.

## Objetivo y evidencia
Completar la base verificable de M0: navegador Chromium en contenedor → build real de la SPA/nginx → API Spring → PostgreSQL 18.6 y OIDC local 3.0.3, gate FULL y contrato pequeño para el primer flujo de Junie. T-002 ya integrada; sus smokes Edge y protocolo HTTP son evidencia previa, no Playwright ni FULL. Referencias: contexto §8–§10, F-01/CA-01 y RN-11/RN-18/RN-20/RN-21 para la futura spec C1; HANDOFF V-02/V-03/H-01…H-03.

Contrato técnico v1 en esta tarea (`spec: null` por ser preparación de infraestructura); S-001 v1/ADR 0002 siguen vigentes e intactos. La spec de negocio S-002 se produce en la parte D, sin implementarla en T-003.

## Alcance
Incluye runner Playwright containerizado, stack efímero y camino explícito de desarrollo con OIDC local, recorridos desktop/móvil, clasificación conservadora de diffs, CI FULL y documentación/contrato de recepción. Un PR y partes secuenciales, excepción de tamaño L de las cuatro tareas M0; cada parte se toma en sesión nueva y deja salida comprobable.

Excluye código de negocio de M1, cambios de auth propia o tokens en browser, fallback del perfil Google, TLS/producción, secretos, datos reales, nuevas integraciones/roles, cambios de AUTONOMY/protecciones, optimización del bundle y endurecimiento del callback de la observación R1(a). Estos últimos siguen en BACKLOG.

## Impacto previsto de implementación
Comportamiento productivo/API/propiedad: se conserva S-001; no se abren recursos comerciales. Datos: DB y volúmenes exclusivamente ficticios por proyecto, sin migración de dominio ni acceso a `stockpilot_db-data`. UI: se prueba la existente, sin nueva pantalla de negocio. Operación: nueva entrada explícita de desarrollo aislado sin Google y gate FULL. CI/clasificador son cambios de riesgo elevado con pruebas negativas; no se activan en esta sesión planner.

## Leer antes
1. [TESTING](../TESTING.md): fase/políticas, contrato propuesto T-003 y reglas de pruebas.
2. [SETUP](../SETUP.md): comandos auth aislada y TR-02/03/05/07/09/10/11.
3. [S-001 v1](../specs/S-001-auth-google.md) y [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md): issuer/origen/proxies/perfiles.
4. [HANDOFF](../HANDOFF.md): 21 criterios y pendientes externos.
5. [ROADMAP](../ROADMAP.md): corte 2026-10-14 y primer ciclo; contexto solo por los IDs citados.

## División antes de implementar
| Parte | Depende de | Salida comprobable y archivos previstos |
|---|---|---|
| A · Stack, runner y desarrollo aislados | T-002 done | `e2e/package.json` + lockfile con gestor, `e2e/playwright.config.ts`, `docker-compose.e2e.yml`, `scripts/e2e.sh` y entrada `scripts/dev-auth.sh`; SETUP/TESTING. Runner arranca build/API/DB/proveedor; readiness real y cleanup comprobados en éxito, fallo de arranque y señal. Camino dev nginx/Vite sin Google probado, incluyendo HMR y resolución por proceso en Windows |
| B · Recorridos de sesión y fallos | A | `e2e/tests/auth.spec.ts`, `system.spec.ts` y helpers mínimos: matriz AC-02…05 en Chromium desktop/móvil, API/DB reales; fallo inducido hace rojo el assert relevante y se restaura. Reportes saneados en fallos |
| C · Gate FULL y política CI | B | `scripts/verify.sh`, `.github/workflows/ci.yml`, `scripts/ci/classify-diff.mjs` y su test, docs-check si necesita coherencia adicional. FULL local verde, matriz del agregado y allowlist probadas; CI draft conserva rechazo intencional, ready exige FULL real |
| D · Primer contrato de M1 | C | S-002 v1 y tareas S T-004 (primera) / T-005 solo si la división lo exige; ARCHITECTURE/ROADMAP. Alta de comercio + comercio activo y aislamiento, contratos API/DB/errores/UI, actor permitido/denegado y matriz test. Se mantienen draft hasta M0 reconciliado; no existe ready condicionado ni implementación M1 en esta tarea |
| E · Evidencia, revisión y traspaso | D + evidencia externa | SETUP/TESTING/HANDOFF, tarea/STATUS/BACKLOG y prompt de recepción. FULL local y CI sobre HEAD publicado; revisión independiente posterior en sesión nueva. `NO_LISTO` mientras falte evidencia; `PENDIENTE_MERGE_M0` solo con criterios comprobados salvo G-03/T-003 abierto; `LISTO_PARA_JUNIE` solo tras MERGED confirmado y 21/21 reconciliados |

Dentro de A, primero fijar versión exacta de `@playwright/test` comprobada contra registry/documentación oficial e imagen Linux correspondiente de la misma versión; registrar pin/digest/compatibilidad en SETUP. No se inventa versión en planificación. Instalar con npm, sin editar lockfile a mano ni cambiar dependencias del client. Cada parte registra impacto efectivo y archivos extra antes de editarlos. No A…E en una sola sesión.

## Contrato del stack y del runner
- E2E usa los servicios/imágenes reales de Compose y el overlay auth existente; el overlay E2E elimina publicaciones host innecesarias y ejecuta Chromium en la red privada. Elegir origen público fijo alcanzable por navegador/proxy/backend dentro de esa red y verificarlo contra PublicOriginFilter; no sustituir issuer entre pasos. Alias `host.docker.internal` del proveedor mantiene discovery/endpoints/config/iss idénticos, sin dependencia de DNS/red externa en las pruebas.
- Proyecto único por ejecución, nombre validado/rechazo de `stockpilot`; DB/volúmenes/red propios. `--env-file` explícito ficticio versionado, perfiles `e2e` y proveedor local explícitos; nunca cargar `.env` real. Backend interno, sin puerto publicado. Dependencias se descargan en instalación/build, no en los escenarios.
- `scripts/e2e.sh` desde raíz prepara/build, espera DB/API/proxy/proveedor con deadlines y comprobaciones HTTP, ejecuta tests y propaga exit code original. Trap instalado antes de `up`, cleanup idempotente en éxito/fallo/señal solo del proyecto propio. Un fallo de cleanup también impide verde. Exportar reportes antes de retirar contenedores; no imprimir codes/tokens/cookies/claims ni logs auth completos.
- `scripts/dev-auth.sh` usa entrada explícita distinta del stack ordinario, mismo proveedor/pines y datos ficticios, proyecto reservado único validado y limpieza de sus recursos al cerrar sesión. Documentar iniciar, reiniciar, detener y retomar nginx/Vite. Windows puede usar resolución por proceso al hostname exacto (TR-11), nunca editar hosts/DNS global ni el issuer. Esta prueba no acredita B-01 ordinario ni Google real.
- Tests de caída/reinicio operan su propio proyecto o se serializan con reconstrucción explícita de fixtures en cada caso, sin depender de orden; no reiniciar servicios usados por otra prueba concurrente.
- Fixtures por test/contexto de navegador, identidades ficticias únicas; login por authorize/callback real. Comprobación PostgreSQL de UUID/fila/created_at desde servicio de prueba interno o `docker compose exec -T db`, sin nueva ruta productiva ni acceso a otra DB. Repetir login/recarga conserva identidad. Reinicio/rebuild conserva huella/identidad en el volumen aislado y cleanup lo elimina.

## Aceptación y pruebas
| ID | Criterio / comando futuro | Nivel / archivo previsto | Evidencia real |
|---|---|---|---|
| AC-01 | `bash scripts/e2e.sh`: build real, todos healthy y proveedor alcanzable; fallos de readiness/test/señal dan nonzero y cero recursos propios residuales; segunda ejecución aislada y sin tocar stack ajeno | runner/Compose; ensayo negativo de A, inspección labels Compose | Pendiente A |
| AC-02 | Visitante ve shell/login, me 401; teclado inicia OIDC real y callback muestra usuario, CSRF listo; recarga y nuevo login mantienen UUID/fila/created_at, fijación/rotación siguen cubiertas en IT de S-001 | E2E `auth.spec.ts` + inspección DB | Pendiente B |
| AC-03 | Logout POST con CSRF → 204, visitante en /login, me 401 y cookie anterior no autentica; expiración por reinicio → mensaje fijo, sin bucle/redirección; login de identidad distinta no muestra identidad anterior | E2E `auth.spec.ts`, API real | Pendiente B |
| AC-04 | Cancelación con state real y callback huérfano → mensaje fijo sin reflejar parámetros; 403 no se interpreta como expiración; respuestas de API observadas sin divulgar datos | E2E auth; 403 ya respaldado por IT/componentes, no abrir endpoint comercial para probarlo | Pendiente B |
| AC-05 | Error de API por detención de server del proyecto → mensaje accesible en español; recuperación/readiness + Reintentar muestra system/info real; 1280 y 375 sin overflow, foco/labels/teclado comprobados | E2E `system.spec.ts`; no sustituir éxito backend por route.fulfill/MSW | Pendiente B |
| AC-06 | Playwright `forbidOnly: true`, retries 0, aislamiento por contexto, assertions/web-first/poll con deadline; trace/screenshot/HTML/JUnit en fallo, sin storageState/cookies ni identidad real; reporte rojo conserva fallo y se sanea antes de publicar | configuración/runner; fallo inducido y revisión artefactos | Pendiente A/B |
| AC-07 | FULL local ejecuta docs + clean verify/Spotless/IT PostgreSQL/JaCoCo + tsc -b/lint/formato/unitarios/build + E2E; --e2e ejecutable, --fast no habilita revisión/merge; fase CI/script/docs coherente | `bash scripts/verify.sh`, `--e2e`, docs-check | Pendiente C |
| AC-08 | Clasificador: solo Markdown raíz, `docs/**/*.md`, AGENTS.md/CLAUDE.md de raíz/server/client y LICENSE con A/M → DOCS_ONLY; `server/src/x.md`, `client/src/x.md`, `docs/x.mjs`, configs/env/scripts/workflows, desconocidos, renombres/borrados/errores → fase técnica | `scripts/ci/classify-diff.test.mjs` con repos temporales; rojo antes de acotar allowlist vigente | Pendiente C |
| AC-09 | verify-required siempre emitido: FULL exige docs/server/client/e2e success; ausente/pending/skipped/cancelled/failure rechaza; DOCS_ONLY exige docs y técnicos skipped; draft rechaza aun con suites verdes. Cierre de M0 fuerza FULL incluyendo HEAD documental final, sin cambiar ruleset | matriz local del agregado + CI sobre SHA publicado; job E2E paralelo con timeout, artefactos fallo 7 días | Pendiente C/E |
| AC-10 | Camino dev explícito sin Google levanta db/server/nginx o Vite con OIDC local, llamada real/login/recarga, reinicio/rebuild conservan identidad ficticia, HMR funcional y cleanup propio | comando `scripts/dev-auth.sh` y ensayos A; SETUP con comandos reales | Pendiente A |
| AC-11 | S-002 C1 con RN/CA trazadas, contratos y migración prevista, permisos/propiedad/errores/375 px, tests por criterio; T-004 pequeña ejecutable solo después del cierre, sin ampliar F-01 a invitaciones | docs-check + revisión de spec/tareas en D | Pendiente D |
| AC-12 | HANDOFF conserva evidencia real y responsables externos; revisión de T-003 en sesión distinta, merge elegible confirmado; 21/21 y prompt completo con raíz/tarea/spec/branch/rol/comandos/límites antes de habilitar Junie | HANDOFF, gh CI/PR, docs-check conjunto | Pendiente E + dueño |

Actualmente solo se valida planificación documental: `bash scripts/verify.sh --docs` (contenedor) y `git diff --check`. BOOTSTRAP sigue efectivo. No acreditar AC de implementación desde el texto; no retries arbitrarios, bypass, tests deshabilitados ni umbrales reducidos. Partes A/B conservan gate BOOTSTRAP y sus pruebas dirigidas; C activa FULL únicamente tras materializar E2E.

## Cierre y bloqueos externos
B-01 ordinario sigue pendiente del dueño con credenciales Google y sin borrar datos persistentes; S-03 real sigue pendiente del dueño; E-01 exige confirmación de Junie disponible en AIR. A…D pueden avanzar sin esos datos; E no declara M0 listo ni habilita Junie si faltan criterios/evidencias. S-03 se reconcilia conforme a su criterio vigente (smoke real o pendiente externo explícito con acción del dueño), sin exigir credenciales como sustituto de ese criterio ni afirmar un smoke no ejecutado. No convertir pruebas aisladas en prueba del stack ordinario ni cambiar criterios para cerrar. Al recibir evidencia, registrar fecha/comando/resultado saneado y responsable; si falta, checkpoint concreto y escalamiento al dueño.

## Checkpoint de planificación · salida
- Revisión de ciclo anticipada 2026-10-14: T-000/#1, T-001/#2 y T-002/#3 integradas; 0 tareas de producto, objetivo C1 conservado, cola sin ready resuelta con este contrato.
- T-002 done reconciliada en el primer commit de esta rama; T-003 ready para A en sesión implementer nueva, único [PR #4](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/4) OPEN/draft. No código ni CI ejecutable implementados aquí; S-002/T-004 aún no existen y se refinan en D.
- Validación real 2026-10-14: `bash scripts/verify.sh --docs` con `COMPOSE_ENV_FILES=.env.example` y `COMPOSE_PROJECT_NAME=stockpilot-t003-planner-docs`, exit 0: 36 Markdown/4 tareas/HANDOFF 9/21. `git diff --check` limpio. No gate técnico nuevo por diff documental; BOOTSTRAP vigente. Log `$TEMP/stockpilot-T003-planner-docs.log`; texto final revalidado exit 0 y red propia retirada; inspección por label sin residuales. Cleanup pendiente ninguno.
- Publicación: primer commit `63fc83c` publicado, PR #4 creado OPEN/draft; rama `ci/T-003-e2e-gate-and-handoff`, base `512bfd9`. HEAD inicial local/tracking/ls-remote/gh coinciden; T-002 reconciliada en ese primer commit. Este checkpoint agrega solo PR real/retoma. CI final y SHA publicados en comentario tras el último push, sin SHA autorreferencial. Kit genérico mejorado solo local/excluido, sin datos del producto.
- Próxima acción: docs-check del checkpoint, commit explícito/push, comprobar HEAD/CI y dejar A para sesión nueva. Prompt canónico único en [STATUS](../STATUS.md#prompt-de-la-siguiente-sesión).

## Decisión del dueño · orden posterior a M0 · 2026-10-14
- Pedido explícito: al terminar M0 y antes de comenzar con Junie, consolidar/optimizar el kit local con lo aprendido, crear la primera versión del starter y dejarla disponible como repositorio template en GitHub para generar proyectos con `gh repo create --template --clone`.
- Impacto antes de editar: solo registrar esta secuencia en tarea/STATUS/BACKLOG/ROADMAP/HANDOFF y aclarar el recorrido genérico local del kit. Sin código, aceptación técnica, nuevos criterios M0, AUTONOMY/protecciones, contratos API, permisos/propiedad, datos ni UI. Sigue planner frontera, Codex API basado en GPT-6, runtime exacto/esfuerzo no expuestos; no se abre otra sesión/modelo/delegación.
- Orden: T-003 A…E → revisión independiente, MERGED y CI FULL de main confirmados, HANDOFF reconciliado → sesión frontera de consolidación del kit local → extracción/implementación y revisión independiente del starter en su carpeta/repositorio propios, validación desde copia limpia y publicación como template → recepción Junie en StockPilot para T-004.
- El resultado técnico `LISTO_PARA_JUNIE` y el inicio efectivo de Junie son distintos: el dueño pospone el segundo hasta completar el kit/starter. No introducir el starter en el alcance ni en el PR de T-003; no tomar T-004 automáticamente al cerrar M0.
- El kit conserva instrucciones genéricas/formulario vacío, sin datos de StockPilot y fuera de Git. La extracción toma el SHA del cierre M0; neutraliza marca/dominio/IDs/URLs/estado, incorpora inicialización y documentación de adopción. Se refina allí la feature de referencia ya descrita en el kit; no se implementa en StockPilot como atajo.
- Próxima sesión sigue siendo T-003 A. Al cierre M0, STATUS debe entregar primero el prompt de consolidación local, después el de extracción del starter, y solo tras comprobar su publicación/validación el de recepción Junie. Nombre/ruta del starter se concretan al preparar esa tarea, no se inventan ahora.
- Validación real de esta aclaración: `bash scripts/verify.sh --docs` conjunto en contenedor exit 0 (36 Markdown/4 tareas/HANDOFF 9/21), diff-check limpio; mismo PR #4 draft, sin código. Log `$TEMP/stockpilot-T003-owner-sequence-docs.log`; red del proyecto documental `stockpilot-t003-owner-sequence-docs` retirada, cleanup pendiente ninguno; sin otros repositorios/stack/datos persistentes. Próxima acción: commit/push explícitos, comprobar HEAD/CI del draft; SHA final y run en comentario de salida.

## Checkpoint A · inicio · 2026-10-14
- Implementer frontera en sesión nueva desde raíz; Codex API basado en GPT-6 según identidad declarada. Runtime exacto/esfuerzo efectivo no expuestos; no se simula GPT-6.1 Sol/high ni se abre otra sesión/modelo/delegación.
- Árbol inicial limpio, sin heredados. HEAD local/remoto/PR #4 cd03ad58200ddd6c1e848b126dc7e8c40433b291; base main 512bfd9c6b143aa484ddce72aad64bb9484e6330. #3 MERGED; #4 único OPEN/draft. CI main 38508440122 SUCCESS BOOTSTRAP; CI #4 38510268984 docs/classify SUCCESS, server/client SKIPPED y verify-required FAILURE intencional DRAFT confirmado en log. Planificación publicada y prompt coinciden.
- Impacto efectivo antes de editar A: runner/config/lockfile e2e, overlays Compose, scripts e2e/dev-auth y biblioteca de ciclo/readiness, probes dirigidos A y documentación. Backend/producto/contratos S-001/permisos/migraciones/UI conservados; solo stack efímero ficticio con red/volumen propios y backend interno. Ensayo HMR modifica/restaura temporalmente fuente existente. Sin CI/clasificador/FULL (C), recorridos B, negocio D ni cierre E. AUTONOMY/protecciones intactas.
- Pin comprobado npm registry y documentación oficial: @playwright/test 1.64.0 (Node >=20), imagen mcr.microsoft.com/playwright:v1.64.0-noble, índice sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f; amd64 bc72a8df40831ded821e3cbc79c318c21b44d6e51dff9fd89ace7a8249c5b462. npm instala lockfile; imagen por tag+digest.
- Próxima acción: docs-check conjunto y publicación de transición; después implementar A. Antes de builds/gate/ensayos largos: logs en $TEMP/stockpilot-T003-A-*.log; cleanup solo proyectos stockpilot-t003-a-* y stockpilot-dev-auth-* creados aquí. No operar stockpilot ni stockpilot_db-data. M0 NO_LISTO 9/21; dueño conserva B-01/S-03/E-01 y orden kit/starter antes de Junie.
