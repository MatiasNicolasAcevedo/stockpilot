package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springdoc.webmvc.api.OpenApiWebMvcResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import server.server.TestcontainersConfiguration;

/**
 * AC-10: the OpenAPI document generated from the running code describes me/csrf/logout with cookie session and CSRF
 * header security, without credentials, while the documentation routes stay denied over HTTP. ADR 0003 switch off:
 * only springdoc's own generation flag is forced on to obtain the bean, so the denial proves the permission depends
 * exclusively on the StockPilot switch (the true default, without springdoc routes, is ApiDocsDisabledIT).
 */
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest(properties = "springdoc.api-docs.enabled=true")
@AutoConfigureMockMvc
class OpenApiContractIT {
    @Autowired
    private OpenApiWebMvcResource openApi;

    @Autowired
    private MockMvc mockMvc;

    private String json;
    private DocumentContext document;

    @BeforeEach
    void generateFromCode() throws Exception {
        // Direct bean call: generation does not require (nor open) the HTTP route.
        var request = new MockHttpServletRequest("GET", "/api/docs/openapi");
        json = new String(openApi.openapiJson(request, "/api/docs/openapi", Locale.ROOT), StandardCharsets.UTF_8);
        document = JsonPath.parse(json);
    }

    @Test
    void describesSessionCookieAndCsrfHeaderSchemes() {
        Map<String, Object> cookie = document.read("$.components.securitySchemes.sessionCookie");
        Map<String, Object> csrf = document.read("$.components.securitySchemes.csrfHeader");

        assertThat(cookie)
                .containsEntry("type", "apiKey")
                .containsEntry("in", "cookie")
                .containsEntry("name", "JSESSIONID");
        assertThat(csrf)
                .containsEntry("type", "apiKey")
                .containsEntry("in", "header")
                .containsEntry("name", "X-XSRF-TOKEN");
        Map<String, Object> schemes = document.read("$.components.securitySchemes");
        assertThat(schemes).containsOnlyKeys("sessionCookie", "csrfHeader");
    }

    @Test
    void describesMeCsrfAndLogoutAsImplemented() {
        assertThat(document.<Map<String, Object>>read("$.paths['/api/v1/auth/me'].get.responses"))
                .containsOnlyKeys("200", "401");
        assertThat(document.<List<String>>read("$.paths['/api/v1/auth/me'].get.responses.200.content.*.schema.$ref"))
                .containsExactly("#/components/schemas/AuthMeResponse");
        assertThat(document.<Map<String, Object>>read("$.components.schemas.AuthMeResponse.properties"))
                .containsOnlyKeys("id", "displayName", "email", "emailVerified");
        assertThat(document.<List<Object>>read("$.paths['/api/v1/auth/me'].get.security[*].sessionCookie"))
                .hasSize(1);

        assertThat(document.<Map<String, Object>>read("$.paths['/api/v1/auth/csrf'].get.responses"))
                .containsOnlyKeys("204");

        assertThat(document.<Map<String, Object>>read("$.paths['/logout'].post.responses"))
                .containsOnlyKeys("204", "403");
        assertThat(document.<String>read(
                        "$.paths['/logout'].post.responses.403.content['application/problem+json'].schema.$ref"))
                .isEqualTo("#/components/schemas/ProblemDetail");
        assertThat(document.<Map<String, Object>>read("$.components.schemas.ProblemDetail"))
                .isNotEmpty();
        assertThat(document.<List<Object>>read("$.paths['/logout'].post.security[*].csrfHeader"))
                .hasSize(2);
        assertThat(document.<Map<String, Object>>read("$.paths['/logout'].get.responses"))
                .containsOnlyKeys("405", "401");
    }

    @Test
    void containsNoCredentialsOrTokenTransport() {
        assertThat(json)
                .doesNotContain("persona@example.com")
                .doesNotContain("fictitious")
                .doesNotContain("stockpilot-test")
                .doesNotContainIgnoringCase("bearer")
                .doesNotContainIgnoringCase("oauth2\"")
                .doesNotContain("access_token")
                .doesNotContain("id_token");
    }

    @Test
    void documentationRoutesStayDeniedOverHttp() throws Exception {
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isUnauthorized());
        // ADR 0003 routes: springdoc serves the document here, but the switch is off.
        for (String path : new String[] {
            "/api/docs/openapi",
            "/api/docs/openapi/swagger-config",
            "/api/docs/openapi.yaml",
            "/api/docs/swagger-ui.html",
            "/api/docs/swagger-ui/index.html"
        }) {
            mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }
}
