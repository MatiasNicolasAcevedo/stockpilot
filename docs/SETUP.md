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
| Playwright | Pendiente (T-003) | — |

Peers y engines de las dependencias nuevas comprobados con `npm view` el 2026-10-13 contra React 19.3, Vite 8, TypeScript 6 y Node 24.21; instaladas con `npm install --save-exact`, sin `--force` ni `--legacy-peer-deps`. El lockfile conserva los bindings nativos de todas las plataformas (`@rolldown/binding-linux-x64-musl`, `lightningcss-linux-x64-musl`), por eso `npm ci` funciona igual en Windows, en `node:alpine` y en CI.

## Primer uso
```bash
git clone https://github.com/MatiasNicolasAcevedo/stockpilot.git
cd stockpilot
docker compose up -d --build --wait     # db + server + client; espera healthchecks
# abrir http://127.0.0.1:5173  (SPA; /api va por el mismo origen al server)
```
- Opcional: copiar `.env.example` a `.env` para cambiar puertos o credenciales de desarrollo (los defaults ya funcionan).
- Si la copia local tiene el kit personal `plantilla/`, excluirlo en cada clon antes de cualquier `git add`: agregar `/plantilla/` al archivo que indica `git rev-parse --git-path info/exclude` y comprobar con `git check-ignore -v -- plantilla/PROJECT_TEMPLATE.md` y `git ls-files -- plantilla` (vacío).

## Comandos habituales (desde la raíz)
| Acción | Comando | Comprobado |
|---|---|---|
| Levantar/reconstruir | `docker compose up -d --build --wait` | Sí (≈1–2 min la primera vez) |
| Estado | `docker compose ps` | Sí |
| Logs del server / client | `docker compose logs -f server` · `docker compose logs -f client` | Sí |
| Reiniciar el server | `docker compose restart server` | Sí; los datos persisten y el client sigue llegando al server (también si se recrea) |
| Detener conservando datos | `docker compose down` | Sí; el volumen `stockpilot_db-data` persiste |
| Frontend con HMR (opcional) | `docker compose --profile dev up -d --build --wait client-dev` → http://127.0.0.1:5174 · detener: `docker compose --profile dev rm -sf client-dev` | Sí (HMR comprobado 2026-10-13); monta solo `src/`, `public/` e `index.html`; tras cambiar dependencias o `vite.config.ts`, reconstruir |
| Frontend en el host (opcional) | `cd client && npm ci` · `npm test` · `npm run dev` (proxy a `http://127.0.0.1:8080`) | Parcial: `npm ci`, `npm test`, typecheck y lint sí; `npm run dev` no ejecutado (usa el puerto 5173 del client: detenerlo antes). `node_modules` del host nunca se monta en contenedores |
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
| server | http://127.0.0.1:8080/actuator/health | Publicado para diagnóstico; `GET /api/v1/system/info` es público, el resto de `/api/**` responde 401 sin sesión |
| db | `127.0.0.1:55432`, DB/usuario `stockpilot`, contraseña de desarrollo `stockpilot-dev-only` | Valores ficticios solo para desarrollo local |

Dentro de la red de Compose el server llega a la DB como `db:5432` y el client al server como `server:8080`; el navegador nunca usa nombres internos.

## Variables de entorno
Definidas con defaults en `docker-compose.yml` y documentadas en [.env.example](../.env.example): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_PORT`, `SERVER_PORT`, `CLIENT_PORT`, `CLIENT_DEV_PORT`, `STOCKPILOT_SERVER_TESTS`. El server recibe `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`. Internas del client (no van en `.env`): `STOCKPILOT_API_TARGET` (destino del proxy de Vite; `http://server:8080` en `client-dev`, `http://127.0.0.1:8080` en el host) y `STOCKPILOT_WATCH_POLLING` (polling de archivos en `client-dev`). El bundle no recibe variables `VITE_*`. Variables de Google OIDC (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_PUBLIC_URL`) se agregan en T-002; los valores reales nunca entran en Git ni en documentos.

## Google OIDC real
Pendiente de T-002: la tarea deja la lista exacta de URIs autorizadas y pasos de Google Cloud para el dueño. Hasta entonces no hay login real.

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
