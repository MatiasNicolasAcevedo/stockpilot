package server.server.security;

import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/** Validated documentation switch (ADR 0003) and the document's only server. Startup fails on an invalid opt-in. */
@Configuration(proxyBeanMethods = false)
class ApiDocsConfiguration {
    @Bean
    ApiDocsAccess apiDocsAccess(Environment environment, PublicOrigin origin) {
        return ApiDocsAccess.from(environment.getProperty(ApiDocsAccess.PROPERTY), origin);
    }

    @Bean
    OpenApiCustomizer publicOriginServer(PublicOrigin origin) {
        // The validated public origin, never a server URL rebuilt from the request.
        return openApi ->
                openApi.setServers(List.of(new Server().url(origin.uri().toASCIIString())));
    }
}
