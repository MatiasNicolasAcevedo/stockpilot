package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springdoc.webmvc.api.OpenApiWebMvcResource;
import org.springdoc.webmvc.ui.SwaggerWelcomeWebMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import server.server.TestcontainersConfiguration;

/**
 * ADR 0003 default (switch absent): springdoc registers no document or UI and every documentation route, new or
 * springdoc's default, falls to the final deny rule: 401 anonymous, 403 with a session.
 */
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ApiDocsDisabledIT {
    @Autowired
    private WebApplicationContext context;

    @Autowired
    private PublicOrigin origin;

    private MockMvc mockMvc;

    @BeforeEach
    void usePublicOrigin() {
        mockMvc = AuthOriginMockMvc.create(context, origin);
    }

    @Test
    void switchIsOffAndSpringdocRegistersNothing() {
        assertThat(context.getBean(ApiDocsAccess.class).enabled()).isFalse();
        assertThat(context.getBeanNamesForType(OpenApiWebMvcResource.class)).isEmpty();
        assertThat(context.getBeanNamesForType(SwaggerWelcomeWebMvc.class)).isEmpty();
    }

    @Test
    void everyDocumentationRouteIsDeniedAnonymouslyAndWithSession() throws Exception {
        for (String path : new String[] {
            "/api/docs/openapi",
            "/api/docs/openapi/swagger-config",
            "/api/docs/openapi.yaml",
            "/api/docs/swagger-ui.html",
            "/api/docs/swagger-ui/index.html",
            "/api/docs/swagger-ui/swagger-initializer.js",
            "/v3/api-docs",
            "/swagger-ui/index.html",
            "/webjars/swagger-ui/index.html"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(401));
            mockMvc.perform(get(path).with(oidcLogin().oidcUser(AuthFixtures.localUser("Demo", null, false))))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }
    }
}
