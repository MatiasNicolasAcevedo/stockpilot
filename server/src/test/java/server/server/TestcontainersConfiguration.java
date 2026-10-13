package server.server;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** PostgreSQL efímero compartido por las pruebas de integración de todos los paquetes. */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    /** Misma imagen fijada que docker-compose.yml (servicio db); docs-check verifica que coincidan. */
    public static final String POSTGRES_IMAGE = "postgres:18.6";

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse(POSTGRES_IMAGE));
    }
}
