# SETUP · Entorno, versiones y comandos

Comandos comprobados en Windows 11 + Docker Desktop el 2026-10-12 (T-000) y el 2026-10-13 (client, T-001), salvo los marcados como pendientes. Las fuentes ejecutables son `server/pom.xml`, `client/package*.json`, `docker-compose.yml` y los Dockerfiles; este documento debe concordar con ellas.

## Requisitos del host (paso 0)
| Herramienta | Versión observada (2026-10-12) | Uso |
|---|---|---|
| Docker Desktop (WSL 2, contenedores Linux) | Desktop 4.49.0 · Engine 28.5.1 | Stack y runners de pruebas |
| Docker Compose V2 | v2.40.2-desktop.1 | `docker compose …` |
| Git for Windows + Git Bash | Git 2.51.1 · Bash 5.2.37 | Repo y scripts `.sh` |
| GitHub CLI | 2.96.0, autenticado como `MatiasNicolasAcevedo` (scopes `repo`, `workflow`) | PRs, checks, merge |
| Node.js / npm | 24.21.0 / 11.19.0 | IDE, iteración del client y cambios de dependencias (`npm install`); el gate usa contenedores |
| JDK del host | Amazon Corretto 21.0.9 | IDE y alternativa preaprobada de pruebas backend |

Docker Desktop debe estar abierto mientras se trabaja. El JDK del host es Corretto (el contrato recomienda Temurin); los contenedores usan Temurin 21.0.12+8, misma major. No se requiere Maven, PostgreSQL ni Node instalados para levantar o probar: todo corre en Compose.

## Versiones efectivas
| Componente | Versión | Fuente |
|---|---|---|
| Java (build/runtime/tests en contenedor) | Temurin 21.0.12+8 (`eclipse-temurin:21.0.12_8-jdk-noble` / `-jre-noble`) | `server/Dockerfile`, `docker-compose.yml` |
| Spring Boot | 4.1.1 (Spring Framework 7.0.9, Security 7.1.1, Hibernate 7.4.5, Jackson 3.1.5) | `server/pom.xml` (BOM) |
| Maven / Wrapper | 3.10.0 / 3.3.4 (`only-script`) | `server/.mvn/wrapper/maven-wrapper.properties` |
| Flyway | 12.4.0 + `flyway-database-postgresql` | BOM de Boot |
| PostgreSQL | 18.6 (`postgres:18.6`, Debian) en Compose y Testcontainers | `docker-compose.yml`, `TestcontainersConfiguration` |
| Driver PostgreSQL | 42.7.13 | BOM de Boot |
| springdoc-openapi | 3.1.1 | `server/pom.xml` |
| Testcontainers / JUnit / Mockito | 2.0.5 / 6.0.3 / 5.23.0 | BOM de Boot |
| Spotless / palantir-java-format / JaCoCo | 3.10.4 / 2.102.0 / 0.8.15 | `server/pom.xml` |
| Node (contenedores y CI) | 24.21.0 (`node:24.21.0-alpine` en docs-check y client; `NODE_VERSION` en CI; docs-check exige que coincidan) | `docker-compose.yml`, `client/Dockerfile`, `ci.yml` |
| React / Vite / TypeScript / ESLint (scaffold) | 19.3.0 / 8.3.4 / 6.0.3 / 10.12.0 (rangos del scaffold `^19.2.8`, `^8.3.0`, `~6.0.2`, `^10.10.0`; exactas en el lockfile) | `client/package.json`, `client/package-lock.json` |
| React Router / MUI + Emotion / TanStack Query | 8.4.0 (modo declarativo) / 9.5.0 + 11.14.0/11.14.1 / 5.104.2 | `client/package.json` (versiones exactas) |
| React Hook Form / @hookform/resolvers / Zod | 7.90.0 / 5.9.1 / 4.6.7 | `client/package.json` |
| Vitest + coverage-v8 / jsdom / MSW | 5.0.4 / 30.1.2 / 3.0.3 | `client/package.json` |
| Testing Library react / dom / jest-dom / user-event | 16.3.3 / 10.4.2 / 7.0.1 / 14.6.7 | `client/package.json` |
| Prettier / eslint-config-prettier | 3.9.10 / 10.1.8 | `client/package.json` |
| nginx (client `runtime`) | 1.30.5 (`nginx:1.30.5-alpine`, rama estable) | `client/Dockerfile` |
| Proveedor OIDC de pruebas | `ghcr.io/navikt/mock-oauth2-server:3.0.3`, pin corregido con autorización explícita del dueño el 2026-10-13 | `compose.auth-test.yml`; B2 Windows/contenedor y protocolo aplicación B3 (`OidcLoginIT`/`OidcFailureIT`) verificados |
| Playwright | Pendiente (T-003) | — |

Peers y engines de las dependencias nuevas comprobados con `npm view` el 2026-10-13 contra React 19.3, Vite 8, TypeScript 6 y Node 24.21; instaladas con `npm install --save-exact`, sin `--force` ni `--legacy-peer-deps`. El lockfile conserva los bindings nativos de todas las plataformas (`@rolldown/binding-linux-x64-musl`, `lightningcss-linux-x64-musl`), por eso `npm ci` funciona igual en Windows, en `node:alpine` y en CI.

## Primer uso
```bash
git clone https://github.com/MatiasNicolasAcevedo/stockpilot.git
cd stockpilot
docker compose up -d --build --wait     # requiere configuración Google privada en backend
# abrir http://127.0.0.1:5173  (SPA; /api va por el mismo origen al server)
```
- Copiar `.env.example` a `.env` y configurar en privado `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` reales y `APP_PUBLIC_URL`. Defaults de DB/puertos son ficticios; credenciales OIDC vacías hacen fallar el arranque sin fallback. Guía Google/smoke real pendientes T-002 D; no presentar auth completa antes de C2/D.
- Si la copia local tiene el kit personal `plantilla/`, excluirlo en cada clon antes de cualquier `git add`: agregar `/plantilla/` al archivo que indica `git rev-parse --git-path info/exclude` y comprobar con `git check-ignore -v -- plantilla/PROJECT_TEMPLATE.md` y `git ls-files -- plantilla` (vacío).

## Comandos habituales (desde la raíz)
| Acción | Comando | Comprobado |
|---|---|---|
| Levantar/reconstruir | `docker compose up -d --build --wait` | Stack ordinario Google aún no operado; último smoke T-001 histórico. Pruebas B2 usan proyectos ficticios aislados |
| Estado | `docker compose ps` | Sí |
| Logs del server / client | `docker compose logs -f server` · `docker compose logs -f client` | Sí |
| Reiniciar el server | `docker compose restart server` | Sí; los datos persisten y el client sigue llegando al server (también si se recrea) |
| Detener conservando datos | `docker compose down` | Sí; el volumen `stockpilot_db-data` persiste |
| Frontend con HMR (opcional) | Elegir `APP_PUBLIC_URL=http://127.0.0.1:5174` para server/client-dev; `docker compose --profile dev up -d --build --wait server client-dev` | Un solo origen auth a la vez; cambiar URL exige recrear server/proxy y callback permitido. HMR T-001 histórico; frontera B2 se prueba con Vite real |
| Frontend en el host (opcional) | `cd client && npm ci`; `APP_PUBLIC_URL=http://127.0.0.1:5173 npm run dev` con backend diagnóstico en origen coherente | Requiere configurar también backend/callback; no conectar un Vite con URL distinta al server. Node_modules del host no se monta en contenedores |
| Diagnóstico directo | `docker compose -f docker-compose.yml -f compose.diagnostic.yml up -d --build --wait db server` | Publicación loopback explícita y forwarding `none`; auth solo coincide con origen directo configurado. Para volver a proxies recrear server con Compose base |
| Smoke de sesión en navegador real | `node scripts/test-auth-ui-smoke.mjs [--vite] [--screenshots <dir>]` | Sí (T-002 D, 2026-10-13, nginx y Vite): stack aislado con proveedor 3.0.3, Edge headless por CDP, 375/1280 sin overflow; cleanup del proyecto y del perfil efímero en finally |
| Frontera auth aislada | `node scripts/test-auth-proxies.mjs` | nginx/Vite observados upstream y backend real, HTTP/HTTPS simulado; sin token exchange ni Google real. Cleanup automático solo proyecto efímero |
| Cambiar dependencias del client | `cd client && npm install --save-exact <pkg>@<versión>` y revisar el diff del lockfile | Sí |
| Gate (fase actual) | `bash scripts/verify.sh` | Ver [TESTING.md](TESTING.md) |
| Solo backend | `bash scripts/verify.sh --server` | Sí |
| Solo client | `bash scripts/verify.sh --client` | Sí |
| Solo documentación | `bash scripts/verify.sh --docs` | Sí |
| Regresión de caída del proxy (stack healthy local, Node del host) | `node scripts/test-proxy-outage.mjs` | Sí (R1, 2026-10-13); detiene/restaura solo server y reinicia client para DNS frío, sin borrar volúmenes |
| Borrar datos de desarrollo | `docker compose down -v` | **No usar** sin decisión explícita del dueño: elimina el volumen de desarrollo |

En PowerShell, invocar los scripts con Git Bash: `& "C:\Program Files\Git\bin\bash.exe" scripts/verify.sh`.

## Puertos y URLs (solo loopback)
| Servicio | URL | Notas |
|---|---|---|
| client | http://127.0.0.1:5173 (`CLIENT_PORT`) | **Origen público único del navegador**: SPA compilada (nginx) + proxy de `/api/`, `/oauth2/`, `/login/oauth2/code/` y `/logout` a `server`. Health del contenedor: `/healthz` |
| client-dev | http://127.0.0.1:5174 (`CLIENT_DEV_PORT`), perfil `dev` | Vite con HMR y el mismo proxy |
| server | `server:8080` interno; diagnóstico explícito http://127.0.0.1:8080/actuator/health | Sin publicación en Compose ordinario; override diagnóstico fija origen directo y forwarding none. Rutas auth con origen reconstruido distinto responden 400 seguro |
| db | `127.0.0.1:55432`, DB/usuario `stockpilot`, contraseña de desarrollo `stockpilot-dev-only` | Valores ficticios solo para desarrollo local |

Dentro de la red de Compose el server llega a la DB como `db:5432` y el client al server como `server:8080`; el navegador nunca usa nombres internos.

## Variables de entorno
Defaults en `docker-compose.yml` y [.env.example](../.env.example): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_PORT`, `CLIENT_PORT`, `CLIENT_DEV_PORT`, `STOCKPILOT_SERVER_TESTS`. `DIAGNOSTIC_SERVER_PORT` solo en override diagnóstico. Backend recibe `SPRING_DATASOURCE_*` y credenciales Google; proxies reciben exclusivamente `APP_PUBLIC_URL` (default http://127.0.0.1:5173, puerto desde CLIENT_PORT si no se fija). nginx valida origen al arrancar y genera config desde template; Vite lo exige para servir. `STOCKPILOT_API_TARGET` es destino interno Vite, `STOCKPILOT_WATCH_POLLING` habilita polling. No hay `VITE_*`, credenciales ni tokens en el bundle. Server/proxies deben elegir la misma URL; ningún request la reemplaza.

## Google OIDC real
Perfil default explícito `google`: requiere `APP_PUBLIC_URL`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en backend; ausencia o perfil real/local mixto falla sin fallback. Issuer Google fijo `https://accounts.google.com`, scopes `openid profile email`, callback `${APP_PUBLIC_URL}/login/oauth2/code/google`. Origen HTTPS sin path/query/fragment/userinfo, o HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`). Cookies derivan Secure del origen. B2 conecta framework forwarding a nginx/Vite: eliminan integralmente headers entrantes Forwarded/X-Forwarded-*, fijan Host/proto/port desde config y for desde peer, rechazan autoridad Host ajena. nginx usa allowlist de headers upstream (incluye cookie/CSRF/body); Vite elimina todo el namespace dinámicamente. Guard backend compara request reconstruido antes de efectos auth: discrepancia → 400/no-store/sin cookie ni redirect. Diagnóstico explícito ignora forwarding con `none`.

### Guía del dueño: credenciales Google reales (S-03)
Solo el dueño hace estos pasos; ningún agente lee ni publica los valores. Fuentes oficiales consultadas el 2026-10-13: [OAuth 2.0 para apps de servidor web](https://developers.google.com/identity/protocols/oauth2/web-server), [crear clientes](https://support.google.com/cloud/answer/15549257) y [audiencia de la app](https://support.google.com/cloud/answer/15549945).
1. En Google Cloud, con un proyecto propio seleccionado, abrir **Google Auth Platform**. En **Branding** completar nombre de la app y email de soporte. En **Audience** elegir **External**; mientras el estado de publicación sea **Testing**, solo hasta 100 usuarios de prueba pueden autorizar: agregar la propia cuenta como usuario de prueba. StockPilot pide solo `openid profile email`.
2. En **Clients** → **Create client** → tipo **Web application**. En **Authorized redirect URIs** cargar exactamente `${APP_PUBLIC_URL}/login/oauth2/code/google`: `http://127.0.0.1:5173/login/oauth2/code/google` para el stack nginx por defecto (o `http://127.0.0.1:5174/login/oauth2/code/google` si se eligió Vite como origen). Google acepta HTTP e IP solo para loopback; cualquier despliegue usa HTTPS. **Authorized JavaScript origins** no hace falta: el navegador no usa librerías de Google. Sin comodines, fragmentos ni rutas distintas. Los cambios pueden tardar de 5 minutos a horas; una diferencia produce `redirect_uri_mismatch`.
3. Al crear el cliente Google muestra el **client secret** una sola vez: guardarlo en un gestor de secretos. Copiar `.env.example` a `.env` en la raíz (ignorado por Git) y completar solo `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, más `APP_PUBLIC_URL` si se cambia el origen. No pegarlos en issues, PRs, chats ni archivos versionados.
4. `docker compose up -d --build --wait` (perfil `google` por defecto; sin credenciales el server no arranca, a propósito). Abrir `http://127.0.0.1:5173` → **Ingresar** → **Continuar con Google**.
5. Smoke esperado: vuelve a `/` con el nombre de la cuenta y «Cerrar sesión»; recargar conserva la sesión; «Cerrar sesión» lleva a `/login` y `GET /api/v1/auth/me` responde 401. Cancelar en Google vuelve a `/login` con el mensaje fijo. Registrar fecha y resultado en el PR o en HANDOFF S-03 **sin** email, nombre ni capturas con datos personales. Cerrar sesión en StockPilot no cierra la sesión de Google.

**Proveedor B2, pin corregido por el dueño:** [compose.auth-test.yml](../compose.auth-test.yml) y [inputs ficticios](../scripts/fixtures/auth-test.env.example) usan proyecto único, PostgreSQL/volumen aislados, perfil `e2e`/registration `google`, sin credenciales reales. Mock exclusivamente `--profile oidc`, imagen exacta 3.0.3. El pin original 3.1.4 no estaba disponible (pull not found, manifest unknown, API tag/release 404); autorización y corrección compatible en S-001 v1/ADR 0002/T-002 conservan aceptación. Pull real 3.0.3 Linux amd64: digest `sha256:876229d27fc99d7b1ab00dcd64a59a8c10826a6260b68f042558d83a0323dfb7`. [Fixture](../scripts/fixtures/oidc.json) original compatible y [probe](../scripts/test-oidc-provider.mjs) comprueban endpoints, firma y claims; el protocolo de StockPilot se acredita por separado en las IT de B3.

Issuer único `http://host.docker.internal:8090/default`, igual en discovery, `iss` y ClientRegistration; mismo puerto interno/publicado exclusivamente loopback. Docker DNS usa alias de red al mock. **Windows requiere resolución limitada al proceso de prueba:** la resolución nativa comprobada no apunta al loopback publicado y devuelve ECONNREFUSED. El probe usa `--windows-loopback` solo en Windows para conectar ese hostname exacto a 127.0.0.1 conservando URL/Host y todas las assertions OIDC. Edge preexistente usa perfil efímero y `--host-resolver-rules=MAP host.docker.internal 127.0.0.1`; el DOM de discovery debe contener el issuer/endpoints exactos. Sin hosts globales, DNS externo ni validaciones desactivadas. Node/browser containerizados usan el alias de red, sin ese flag.

Comprobación B2 repetible desde la raíz: `node scripts/test-oidc-provider-stack.mjs`. Crea proyecto `stockpilot-t002-b2-provider-PID`, usa únicamente `--env-file scripts/fixtures/auth-test.env.example`, espera readiness con deadline, ejecuta probe desde Node 24.21.0 containerizado y Windows, verifica discovery en Edge headless aislado y desde el namespace del backend real con PostgreSQL 18.6. Comprueba publicación loopback y ausencia de puerto backend publicado. `finally` retira proyecto/volumen ficticio y perfil efímero del navegador; no toca stockpilot_db-data. Requiere Docker Desktop/Compose y Edge Windows preexistente; salida saneada sin tokens/claims/credenciales. Para ejecutar el probe solo, requiere el mock ya levantado: `node scripts/test-oidc-provider.mjs --windows-loopback` en Windows o sin flag en Node de la red del proyecto. La fixture del runner fija 8090/5175; no es un comando para el stack persistente. Guía Google/smoke real con dueño siguen D.


Puerto estándar explícito (`https://demo.example:443`) conserva el callback de APP_PUBLIC_URL y acepta Host con o sin `:443`, que representan el mismo origen. Los proxies reconstruyen autoridad canónica y puerto efectivo; puertos ajenos siguen rechazados. No confundir HTTPS simulado con TLS real.

**Protocolo B3:** el gate backend incluye `OidcLoginIT` (3.0.3 real) y `OidcFailureIT` (respuestas negativas HTTP/JWKS exclusivas de test), con Tomcat y PostgreSQL reales. Para iterar dentro del runner: `docker compose --env-file .env.example -p stockpilot-auth-protocol-it --profile verify run --rm server-tests ./mvnw -B -ntp '-Dit.test=OidcLoginIT,OidcFailureIT' verify`. Testcontainers administra proveedor/DB ficticios con puertos efímeros; configuración/discovery/iss mantienen el mismo issuer de cada flujo. El mock usa host efectivo/mapped port (TR-03); la fixture negativa usa loopback del JVM y control positivo. No modifica la topología 8090 de B2 ni requiere resolución Windows para estas IT containerizadas. Retirar únicamente red/caché del proyecto de prueba al terminar: `docker compose --env-file .env.example -p stockpilot-auth-protocol-it --profile verify down --volumes --remove-orphans`. Detalle de conducta y límites en [TESTING](TESTING.md); C2/D y Google real pendientes.

## Fuentes y limitaciones
Context7 **no estaba disponible** en T-000 ni en la implementación inicial de T-001; sí se consultó en la corrección R1, junto con la documentación oficial de nginx enlazada en TR-08. En T-001 las versiones, peers y engines del client salieron del registro npm (`npm view`), la API de las majors nuevas (MSW 3, React Router 8, jest-dom 7, Vitest 5) de sus tipos/exports instalados, y el tag de nginx de Docker Hub. Se consultaron fuentes oficiales: metadata de Maven Central (Boot, springdoc, Spotless, palantir-java-format, JaCoCo, Maven), Docker Hub (postgres, eclipse-temurin, node), [springdoc.org](https://springdoc.org/) (recomienda la última 3.x estable para Boot 4), releases de GitHub Actions resueltos con `gh api`. Los paquetes de Boot 4.1.1 (slices de test, auto-configuraciones) se comprobaron en los jars resueltos.

## Trampas conocidas
| ID | Síntoma | Causa | Verificación / solución |
|---|---|---|---|
| TR-01 | `FATAL: invalid value for parameter "TimeZone": "America/Buenos_Aires"` al conectar a PostgreSQL desde pruebas en el host Windows | El driver envía la zona del JVM; la imagen `postgres:18.6` (Debian trixie, sin `tzdata-legacy`) no acepta ese alias legado | Runners de pruebas y runtime con `-Duser.timezone=UTC` (POM y Dockerfile). Comprobado: falla sin el flag, pasa con él |
| TR-02 | Diferencias CRLF/LF en Windows | `core.autocrlf=true` a nivel sistema en Git for Windows | `.gitattributes` fuerza `eol=lf` (salvo `.cmd/.bat/.ps1`); no cambiar la configuración global |
| TR-03 | Testcontainers no alcanza los contenedores desde `server-tests` | El runner es un contenedor: `localhost` es él mismo | Socket montado + `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` (+ `host-gateway` en Linux). Funcionó en Docker Desktop el 2026-10-12 |
| TR-04 | Ruleset muestra `require_extra_approval_for_unattributed_changes: true` | Default que GitHub agregó al crear el ruleset; sin documentación pública encontrada | No modificarlo (configuración del dueño). **No bloqueó** el primer merge real (PR #1, squash con `--match-head-commit`, 2026-10-13, commit `9f061f5`) con 0 aprobaciones formales y una sola identidad. Si alguna vez bloquea, informar al dueño |
| TR-05 | `server/target` aparece con archivos creados desde Linux | `server-tests` monta `./server` para exportar reportes | Es esperado; `target/` está ignorado y `clean` lo regenera |
| TR-06 | CI: `No matching version found for SemVer '21.0.12+8'` en `actions/setup-java` | Temurin publica las versiones como `21.0.12+8.0.LTS` (también existen respins `+101`) | `JAVA_VERSION: 21.0.12+8.0.LTS` en `ci.yml`, misma build que la imagen `eclipse-temurin:21.0.12_8`. Comprobado en el run 38337313364 del PR #1 |
| TR-07 | Tras `git push` y `gh pr ready` casi simultáneos, `verify-required` falla como DRAFT en un PR que ya es ready | Se encolan dos runs (`synchronize` con payload `draft=true` y `ready_for_review`); `concurrency` cancela el primero que estaba en curso y puede sobrevivir el de payload viejo | El clasificador lee el estado draft vigente por API (`pull-requests: read`). Si aun así ocurre, relanzar el run vigente o publicar un nuevo commit; nunca interpretar el DRAFT como verde. Observado en los runs 38337802983/38337803034 del PR #1 |
| TR-08 | La caída de `server` tras tráfico exitoso devolvía 502 en 14,22 s (revisión: 14,43 s); DNS frío ya fallaba en ~1 s | `resolver_timeout` solo limita DNS; conectar a la IP anterior esperaba el fallo TCP del SO (`Host is unreachable`). Los reintentos de Query agregan su backoff | `resolver_timeout 1s` **y** `proxy_connect_timeout 1s` en `client/nginx.conf`. Regresión real `node scripts/test-proxy-outage.mjs`: antes del fix falla al superar 3 s; después, IP resuelta → 504 en 1,003296 s (`while connecting to upstream`), DNS frío → 502 en 1,003581 s (`could not be resolved`), recuperación 200 en ambos casos. UI móvil: tras tráfico exitoso, dos 504 y un 502 al expirar DNS; DNS frío, tres 502; error en español y Reintentar recupera el dato. Secuencias de requests observadas en ~6 s, no una garantía universal de latencia: son límites separados de DNS/conexión, no de lectura de una respuesta ya conectada. No se aumentaron esperas ni reintentos. Fuentes: [proxy_connect_timeout](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_connect_timeout), [resolver_timeout](https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver_timeout). Comprobado el 2026-10-13 |
| TR-09 | HMR de `client-dev` no reacciona a cambios hechos desde Windows | Los bind mounts de Docker Desktop no propagan eventos de archivos al contenedor | `STOCKPILOT_WATCH_POLLING=true` (polling cada 300 ms) en `client-dev`. Comprobado con un cambio real: DOM actualizado sin recarga |
| TR-10 | Capturas de Edge/Chrome headless a 375 px salen recortadas | `--window-size` tiene un mínimo efectivo de 504 px en headless | Para capturas manuales usar emulación de dispositivo (CDP `Emulation.setDeviceMetricsOverride`); Playwright (T-003) fija el viewport por sí mismo |
| TR-11 | Proveedor loopback inaccesible en Windows por host.docker.internal (ECONNREFUSED tras readiness) | Resolución nativa no apunta al loopback publicado; alias Docker sí funciona | Probe Windows y Edge de prueba aplican resolución por proceso al hostname exacto, mantienen issuer/Host/claims. Runner B2 verifica ambos lados; sin hosts globales. Ver sección Google OIDC real |
