# StockPilot

Aplicación web multiempresa para pequeños comercios de distintos rubros: cada comercio administra sus productos y existencias, incorpora empleados por invitación y registra ventas simples con un único medio de pago, conservando el historial de movimientos y sin acceso cruzado entre comercios. Es un proyecto demostrativo de portfolio; todos los datos de ejemplo son ficticios.

> **Estado:** en preparación técnica (hito M0). Hoy existen la base del backend (PostgreSQL + Flyway, seguridad deny-by-default, pruebas con Testcontainers), la base del frontend (shell en español que consulta el backend, con sus patrones y pruebas) y la gobernanza del repositorio. El login con Google y los flujos de negocio todavía **no** están implementados. Avance en [docs/STATUS.md](docs/STATUS.md).

## Stack
- **Backend:** Java 21, Spring Boot 4.1 (MVC, Data JPA, Validation, Security, OAuth2 Client, Actuator), Flyway, PostgreSQL 18.
- **Frontend:** React 19 + TypeScript + Vite, Material UI, TanStack Query, React Router, React Hook Form + Zod; servido por nginx como origen único con proxy al backend.
- **Identidad:** Google OpenID Connect con sesión en el backend y CSRF (en preparación).
- **Operación y pruebas:** Docker Compose, JUnit + Testcontainers, Vitest + Testing Library + MSW, Playwright (en preparación), GitHub Actions.

## Requisitos
Docker Desktop (o Docker Engine) con Compose V2 y Git Bash/WSL para los scripts. No hace falta instalar Java, Maven, Node ni PostgreSQL para levantar o probar: todo corre en contenedores. Detalle y versiones en [docs/SETUP.md](docs/SETUP.md).

## Levantar
```bash
docker compose up -d --build --wait            # db + server + client
# abrir http://127.0.0.1:5173 en el navegador (SPA; /api va por el mismo origen)
curl http://127.0.0.1:5173/api/v1/system/info   # {"name":"StockPilot","version":"..."}
docker compose down                             # conserva los datos de desarrollo
```

## Probar
```bash
bash scripts/verify.sh            # gate de la fase actual (docs + backend + client)
bash scripts/verify.sh --server   # solo backend: Spotless, unitarios, integración PostgreSQL, JaCoCo
bash scripts/verify.sh --client   # solo client: typecheck, lint, formato, tests con cobertura, build
```
Políticas de verificación y CI en [docs/TESTING.md](docs/TESTING.md).

## Documentación
| Documento | Contenido |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Intención, alcance, reglas y criterios de aceptación del producto |
| [docs/PROJECT.md](docs/PROJECT.md) | Brief operativo |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura y decisiones |
| [docs/ROADMAP.md](docs/ROADMAP.md) · [docs/BACKLOG.md](docs/BACKLOG.md) | Hitos y cola de trabajo |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Ramas, commits, PRs y revisión |
| [AGENTS.md](AGENTS.md) | Instrucciones para agentes de desarrollo |

## Licencia
Distribuido bajo la [licencia MIT](LICENSE). © 2026 Matias Nicolas Acevedo.
