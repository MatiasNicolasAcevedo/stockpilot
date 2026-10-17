package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import server.server.TestcontainersConfiguration;

/**
 * ADR 0003 switched on through the real environment name with the fictitious loopback origin of the test profile: the
 * document, its UI configuration and Swagger UI are served anonymously and GET-only under /api/docs/; any other
 * documentation route or method stays denied and the API contract is unchanged. Requests carry no credentials.
 */
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest(properties = "STOCKPILOT_API_DOCS_ENABLED=true")
class ApiDocsEnabledIT {
    private static final String ORIGIN = "http://127.0.0.1:5173";
    private static final String[] OPEN_PATHS = {
        "/api/docs/openapi",
        "/api/docs/openapi/swagger-config",
        "/api/docs/swagger-ui.html",
        "/api/docs/swagger-ui/index.html",
        "/api/docs/swagger-ui/swagger-initializer.js"
    };

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
    void servesTheDocumentAnonymouslyWithTheValidatedOriginAsOnlyServer() throws Exception {
        var result = mockMvc.perform(get("/api/docs/openapi"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andReturn();
        assertNoSession(result);
        String json = result.getResponse().getContentAsString();
        DocumentContext document = JsonPath.parse(json);

        assertThat(document.<List<Map<String, Object>>>read("$.servers")).hasSize(1);
        assertThat(document.<String>read("$.servers[0].url")).isEqualTo(ORIGIN);
        assertThat(document.<Map<String, Object>>read("$.paths['/api/v1/system/info'].get"))
                .isNotEmpty();
        assertThat(document.<Map<String, Object>>read("$.paths['/api/v1/auth/me'].get"))
                .isNotEmpty();
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
    void neverRebuildsTheServerFromTheRequest() throws Exception {
        // Documentation routes are outside PublicOriginFilter: a request for another host still gets the fixed origin.
        var otherHost = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        String json = otherHost
                .perform(get("/api/docs/openapi").header("Host", "docs.example.invalid:8443"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(JsonPath.parse(json).<List<String>>read("$.servers[*].url")).containsExactly(ORIGIN);
        assertThat(json).doesNotContain("docs.example.invalid");
    }

    @Test
    void uiConfigurationPointsToTheDocumentAndOnlySubmitsGet() throws Exception {
        mockMvc.perform(get("/api/docs/openapi/swagger-config"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.url").value("/api/docs/openapi"))
                .andExpect(jsonPath("$.configUrl").value("/api/docs/openapi/swagger-config"))
                .andExpect(jsonPath("$.supportedSubmitMethods", contains("get")))
                .andExpect(jsonPath("$.persistAuthorization").value(false));
    }

    @Test
    void servesSwaggerUiFromItsRootWithoutExternalUrlsOrCsrfSupport() throws Exception {
        mockMvc.perform(get("/api/docs/swagger-ui.html"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/api/docs/swagger-ui/index.html"));
        var index = mockMvc.perform(get("/api/docs/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andReturn();
        assertNoSession(index);
        assertThat(index.getResponse().getContentAsString()).contains("./swagger-initializer.js");
        String initializer = mockMvc.perform(get("/api/docs/swagger-ui/swagger-initializer.js"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(initializer)
                .contains("\"configUrl\" : \"/api/docs/openapi/swagger-config\"")
                .contains("\"supportedSubmitMethods\" : [ \"get\" ]")
                .contains("\"persistAuthorization\" : false")
                .doesNotContain("petstore")
                .doesNotContain("https://")
                .doesNotContainIgnoringCase("xsrf")
                .doesNotContainIgnoringCase("csrf");
        mockMvc.perform(get("/api/docs/swagger-ui/swagger-ui-bundle.js"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/javascript"));
    }

    @Test
    void otherDocumentationRoutesStayDenied() throws Exception {
        for (String path : new String[] {
            "/api/docs/openapi.yaml",
            "/api/docs/openapi/",
            "/api/docs",
            "/v3/api-docs",
            "/v3/api-docs/swagger-config",
            "/v3/api-docs.yaml",
            "/swagger-ui.html",
            "/swagger-ui/index.html",
            "/webjars/swagger-ui/index.html"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
            mockMvc.perform(get(path).with(oidcLogin().oidcUser(AuthFixtures.localUser("Demo", null, false))))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void openRoutesDenyEveryMethodButGet() throws Exception {
        Cookie token = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        for (String path : OPEN_PATHS) {
            for (HttpMethod method : new HttpMethod[] {HttpMethod.HEAD, HttpMethod.OPTIONS}) {
                mockMvc.perform(request(method, path)).andExpect(status().isUnauthorized());
            }
            for (HttpMethod method :
                    new HttpMethod[] {HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE}) {
                // A valid CSRF pair reaches authorization: the method itself is denied, not only the missing token.
                mockMvc.perform(request(method, path).cookie(token).header("X-XSRF-TOKEN", token.getValue()))
                        .andExpect(status().isUnauthorized());
                mockMvc.perform(request(method, path)).andExpect(status().isForbidden());
            }
        }
    }

    @Test
    void apiContractIsUnchangedWhileDocumentationIsOn() throws Exception {
        mockMvc.perform(get("/api/v1/system/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("StockPilot"));
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
        mockMvc.perform(get("/api/v1/stores")).andExpect(status().isUnauthorized());
    }

    private static void assertNoSession(MvcResult result) {
        assertThat(result.getResponse().getCookie("JSESSIONID")).isNull();
        assertThat(result.getRequest().getSession(false)).isNull();
    }
}
