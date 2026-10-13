# SETUP · Entorno, versiones y comandos

Comandos comprobados en Windows 11 + Docker Desktop el 2026-10-12 (T-000), salvo los marcados como pendientes. Las fuentes ejecutables son `server/pom.xml`, `client/package*.json`, `docker-compose.yml` y los Dockerfiles; este documento debe concordar con ellas.

## Requisitos del host (paso 0)
| Herramienta | Versión observada (2026-10-12) | Uso |
|---|---|---|
| Docker Desktop (WSL 2, contenedores Linux) | Desktop 4.49.0 · Engine 28.5.1 | Stack y runners de pruebas |
| Docker Compose V2 | v2.40.2-desktop.1 | `docker compose …` |
| Git for Windows + Git Bash | Git 2.51.1 · Bash 5.2.37 | Repo y scripts `.sh` |
| GitHub CLI | 2.96.0, autenticado como `MatiasNicolasAcevedo` (scopes `repo`, `workflow`) | PRs, checks, merge |
| Node.js / npm | 24.21.0 / 11.19.0 | IDE y generadores; el gate usa contenedores |
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
| Node (contenedores) | 24.21.0 (`node:24.21.0-alpine` para docs-check) | `docker-compose.yml` |
| React / Vite / TypeScript / ESLint (scaffold) | 19.2.8 / 8.3.0 / ~6.0.2 / 10.10.0 (rangos del scaffold; exactas en el lockfile) | `client/package.json`, `client/package-lock.json` |
| Router / MUI / Query / Vitest / Playwright | Pendiente (T-001/T-003) | — |

## Primer uso
```bash
git clone https://github.com/MatiasNicolasAcevedo/stockpilot.git
cd stockpilot
docker compose up -d --build --wait     # db + server; espera healthchecks
```
- Opcional: copiar `.env.example` a `.env` para cambiar puertos o credenciales de desarrollo (los defaults ya funcionan).
- Si la copia local tiene el kit personal `plantilla/`, excluirlo en cada clon antes de cualquier `git add`: agregar `/plantilla/` al archivo que indica `git rev-parse --git-path info/exclude` y comprobar con `git check-ignore -v -- plantilla/PROJECT_TEMPLATE.md` y `git ls-files -- plantilla` (vacío).

## Comandos habituales (desde la raíz)
| Acción | Comando | Comprobado |
|---|---|---|
| Levantar/reconstruir | `docker compose up -d --build --wait` | Sí (≈1 min la primera vez) |
| Estado | `docker compose ps` | Sí |
| Logs del server | `docker compose logs -f server` | Sí |
| Reiniciar el server | `docker compose restart server` | Sí; los datos persisten |
| Detener conservando datos | `docker compose down` | Sí; el volumen `stockpilot_db-data` persiste |
| Gate (fase actual) | `bash scripts/verify.sh` | Ver [TESTING.md](TESTING.md) |
| Solo backend | `bash scripts/verify.sh --server` | Sí |
| Solo documentación | `bash scripts/verify.sh --docs` | Sí |
| Borrar datos de desarrollo | `docker compose down -v` | **No usar** sin decisión explícita del dueño: elimina el volumen de desarrollo |

En PowerShell, invocar los scripts con Git Bash: `& "C:\Program Files\Git\bin\bash.exe" scripts/verify.sh`.

## Puertos y URLs (solo loopback)
| Servicio | URL | Notas |
|---|---|---|
| server | http://127.0.0.1:8080/actuator/health | Health público; `/api/**` responde 401 sin sesión |
| db | `127.0.0.1:55432`, DB/usuario `stockpilot`, contraseña de desarrollo `stockpilot-dev-only` | Valores ficticios solo para desarrollo local |
| client | Pendiente (T-001) | Origen público único con proxy a server |

Dentro de la red de Compose el server llega a la DB como `db:5432`; el navegador nunca usa nombres internos.

## Variables de entorno
Definidas con defaults en `docker-compose.yml` y documentadas en [.env.example](../.env.example): `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_PORT`, `SERVER_PORT`, `STOCKPILOT_SERVER_TESTS`. El server recibe `SPRING_DATASOURCE_URL/USERNAME/PASSWORD`. Variables de Google OIDC (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_PUBLIC_URL`) se agregan en T-002; los valores reales nunca entran en Git ni en documentos.

## Google OIDC real
Pendiente de T-002: la tarea deja la lista exacta de URIs autorizadas y pasos de Google Cloud para el dueño. Hasta entonces no hay login real.

## Fuentes y limitaciones
Context7 **no estaba disponible** en la sesión de T-000. Se consultaron fuentes oficiales: metadata de Maven Central (Boot, springdoc, Spotless, palantir-java-format, JaCoCo, Maven), Docker Hub (postgres, eclipse-temurin, node), [springdoc.org](https://springdoc.org/) (recomienda la última 3.x estable para Boot 4), releases de GitHub Actions resueltos con `gh api`. Los paquetes de Boot 4.1.1 (slices de test, auto-configuraciones) se comprobaron en los jars resueltos.

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
