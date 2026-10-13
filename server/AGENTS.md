# AGENTS.md · server/

Reglas del backend; complementan el AGENTS.md raíz. Detalle de diseño en docs/ARCHITECTURE.md.

## Stack y comandos
Java 21 (Temurin en contenedores) · Spring Boot 4.1.1 · Maven Wrapper (Maven 3.10.0) · PostgreSQL 18.6 · Flyway.
Versiones efectivas: pom.xml y docs/SETUP.md (deben concordar).
Gate backend: `bash scripts/verify.sh --server` desde la raíz (runner server-tests de Compose).
Iteración en el IDE/host (Git Bash): `./mvnw spotless:apply` y `./mvnw clean verify` con Docker Desktop abierto.
`./mvnw test` solo corre unitarios/slices: no demuestra la integración (`*IT` corre en `verify` con Failsafe).

## Estructura
Paquetes por feature bajo `server.server`: `<feature>/` con controller, DTOs, servicio/caso de uso y persistencia.
Separar en subpaquetes `web/`, `application/`, `persistence/` (y `domain/` si hay invariantes) cuando la feature crezca.
`identity/` identidad local OIDC; `security/` configuración de seguridad; `shared/error/` errores transversales.
No acceder a repositorios de otra feature como atajo; exponer un servicio/API interna y evitar ciclos.
`ServerApplication` queda en el paquete raíz para el escaneo de componentes.

## Reglas
Controller fino: valida entrada HTTP y delega; sin transacciones ni reglas de negocio.
Servicio/caso de uso: reglas, autorización contextual (pertenencia y rol por comercio) y límite transaccional.
DTOs `record` separados de entidades; nunca devolver entidades JPA por HTTP. Bean Validation en la entrada.
Errores como ProblemDetail (`application/problem+json`); 401 sin sesión, 403 sin permiso o CSRF; sin stack traces.
Recursos de otro comercio: denegar sin revelar existencia (ver PROJECT_CONTEXT RN-20 y CA-13).
Inyección por constructor; sin `XService`/`XServiceImpl` sin necesidad; sin `@Data` en entidades relacionadas.
Importes ARS con `BigDecimal` escala 2 (`NUMERIC(12,2)`); cantidades enteras; instantes `Instant` en UTC (`TIMESTAMPTZ`).
Reglas temporales con `Clock` inyectado. Identificadores UUID v7 generados por la aplicación.
Esquema solo por Flyway (`src/main/resources/db/migration/V<n>__<slug>.sql`), Hibernate `validate`, `open-in-view=false`.
Migraciones aplicadas son inmutables; un cambio posterior es una migración nueva. Sin migraciones destructivas sin autorización.
Constraints de DB respaldan unicidad e integridad; concurrencia de stock con una estrategia probada (spec de ventas).
Actuator: solo health público. Logs sin tokens, correos ni datos sensibles.

## Pruebas
Unitarios/slices: `*Test` (Surefire). Integración con PostgreSQL real: `*IT` (Failsafe) importando `TestcontainersConfiguration`.
Imagen PostgreSQL de pruebas = la de docker-compose.yml (`postgres:18.6`); docs-check verifica que coincidan.
`@SpringBootTest` + MockMvc para flujo completo; datos de cada test aislados y ficticios.
Slices de seguridad: `@WebMvcTest` + `@Import(SecurityConfig.class)`; `oidcLogin()` prueba permisos, no el protocolo OIDC.
Los runners fijan `-Duser.timezone=UTC` (ver trampa TR-01 en docs/SETUP.md).
Formato: Spotless + palantir-java-format; `spotless:check` corre en `verify`.
Cobertura JaCoCo (unit + IT combinados): umbrales efectivos y su evolución en docs/TESTING.md.
