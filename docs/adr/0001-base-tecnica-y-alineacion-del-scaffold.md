# ADR 0001 · Base técnica y alineación del scaffold

- **Estado:** aceptada · 2026-10-12 · T-000 (implementación Opus 5.5 / Claude Code).
- **Contexto de producto:** [PROJECT_CONTEXT.md §9](../../PROJECT_CONTEXT.md#9-base-técnica-ya-acordada) fija el stack: Java 21 LTS, Spring Boot GA mantenido, PostgreSQL en contenedores (major 18 recomendado), Flyway, React/TS/Vite/MUI, Compose y Google OIDC con sesión.

## Contexto
El inventario del 2026-10-12 encontró scaffolds recién generados y compatibles, con dos desvíos respecto de lo acordado:

1. `server/pom.xml` declaraba `java.version` **25**, aunque el contexto confirma **Java 21 LTS** y el host tiene JDK 21.
2. Testcontainers usaba `postgres:latest`, contrario a fijar la misma versión en desarrollo, integración y E2E.

Versiones vigentes consultadas en Maven Central y Docker Hub ese día: Spring Boot 4.1.1 es el último GA de 4.1 (4.2 solo milestones); springdoc publica 3.1.1 y su documentación recomienda la última estable de 3.x para Boot 4; PostgreSQL 18.6; Temurin 21.0.12+8; Node 24.21.0. Context7 no estaba disponible en la sesión: se usaron fuentes oficiales (registro en [SETUP.md](../SETUP.md#fuentes-y-limitaciones)).

## Decisión
- **Java 21** (`java.version=21`), Temurin `21.0.12_8` en imágenes de build/runtime/tests. La decisión confirmada del dueño prevalece sobre el default del generador; Java 25 queda como posible actualización futura en tarea propia.
- **Conservar** Spring Boot 4.1.1, Maven Wrapper 3.3.4 (Maven 3.10.0), los starters modulares de Boot 4 y Testcontainers 2.0.5 gestionados por el BOM. Conservar el paquete generado `server.server`.
- **springdoc-openapi 3.1.1** (parche sobre el 3.1.0 generado), por recomendación del mantenedor; compatible con Boot 4.
- **PostgreSQL `postgres:18.6`** en Compose y Testcontainers (misma imagen; docs-check lo verifica). Volumen en `/var/lib/postgresql` según la imagen oficial de 18+.
- **Calidad de build:** Spotless con palantir-java-format (único formateador, `check` en `verify`), Failsafe para `*IT`, JaCoCo con datos unit+IT combinados y `check` con umbrales 0 en M0 (sube en M1, ver [TESTING.md](../TESTING.md#cobertura)), Mockito como agente Java (JDK 21+).
- **Zona horaria:** JVM con `-Duser.timezone=UTC` en runtime y pruebas; instantes en `TIMESTAMPTZ`.
- **Identificadores:** UUID v7 generados por Hibernate (`@UuidGenerator(style = VERSION_7)`), no enumerables y ordenables por tiempo.
- **Pruebas backend en contenedor:** el runner `server-tests` monta el socket de Docker y usa `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`; funcionó en Docker Desktop/Windows al primer intento, por lo que **no** se aplicó la alternativa preaprobada de host. Esa alternativa sigue disponible y documentada.

## Alternativas consideradas
- Mantener Java 25: válido técnicamente, pero contradice una decisión confirmada y el JDK del host.
- `postgres:18.6-alpine`: imagen menor, pero musl/locales difieren de la imagen Debian; se prefirió la oficial por defecto.
- google-java-format o spring-javaformat: igualmente válidos; palantir ofrece 120 columnas y lectura cómoda con un único motor fijado.
- IDs `BIGINT` secuenciales: más simples, pero expuestos en URLs permiten enumerar; UUID v7 conserva orden temporal.

## Consecuencias
- El código generado se reformateó con Spotless (cambia indentación de tabs a espacios en Java).
- Toda imagen/versión nueva se fija explícitamente y se actualiza en una tarea con gate completo.
- La DB de desarrollo (volumen `stockpilot_db-data`) y las de pruebas (contenedores efímeros) nunca se comparten.
