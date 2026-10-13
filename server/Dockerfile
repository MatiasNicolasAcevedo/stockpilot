# syntax=docker/dockerfile:1
# Imagen del backend StockPilot: build con Maven Wrapper sobre JDK 21 y runtime JRE 21 sin privilegios.
# Las pruebas no corren aquí: las ejecuta el runner server-tests de docker-compose.yml (ver docs/TESTING.md).
ARG JDK_IMAGE=eclipse-temurin:21.0.12_8-jdk-noble
ARG JRE_IMAGE=eclipse-temurin:21.0.12_8-jre-noble

FROM ${JDK_IMAGE} AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -q dependency:resolve
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -DskipTests package \
    && cp target/server-*.jar /workspace/app.jar

FROM ${JRE_IMAGE} AS runtime
RUN groupadd --system app && useradd --system --gid app --home-dir /app --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/app.jar app.jar
USER app
EXPOSE 8080
# Instantes en UTC en la JVM; la zona de presentación se resuelve en la interfaz (PROJECT_CONTEXT P-05).
ENTRYPOINT ["java", "-Duser.timezone=UTC", "-jar", "/app/app.jar"]
