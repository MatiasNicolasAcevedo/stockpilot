package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import server.server.identity.IdentityService;

/** Contrato de rechazo de la base de seguridad: JSON ProblemDetail, nunca HTML ni redirección al login. */
@ActiveProfiles("test")
@WebMvcTest
@Import(SecurityConfig.class)
class SecurityConfigTest {

    @MockitoBean
    private IdentityService identityService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private PublicOrigin origin;

    @BeforeEach
    void usePublicOrigin() {
        mockMvc = AuthOriginMockMvc.create(context, origin);
    }

    @Test
    void anonymousApiRequestGets401ProblemDetail() throws Exception {
        mockMvc.perform(get("/api/v1/stores").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("Se requiere iniciar sesión."));
    }

    @Test
    void stateChangingRequestWithoutCsrfTokenGets403ProblemDetail() throws Exception {
        mockMvc.perform(post("/api/v1/stores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Comercial Demo\"}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void formLoginAndHttpBasicAreDisabled() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/stores").header("Authorization", "Basic dXNlcjpwYXNz"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void localSessionDoesNotGrantAccessToCommercialOrNeighbouringRoutes() throws Exception {
        for (String path : new String[] {
            "/api/v1/stores",
            "/api/v1/auth/me/extra",
            "/api/v1/auth/csrf/extra",
            "/oauth2/authorization/other",
            "/login/oauth2/code/other"
        }) {
            mockMvc.perform(get(path).with(oidcLogin().oidcUser(AuthFixtures.localUser("Demo", null, false))))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }
    }

    @Test
    void onlyExactGoogleGetRoutesCanStartOrProcessOidc() throws Exception {
        for (String path : new String[] {
            "/api/v1/auth/me/extra",
            "/api/v1/auth/csrf/extra",
            "/oauth2/authorization/other",
            "/oauth2/authorization/google/extra",
            "/login/oauth2/code/other",
            "/login/oauth2/code/google/extra"
        }) {
            mockMvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().doesNotExist("Location"));
        }
        for (String path : new String[] {
            "/api/v1/auth/me", "/api/v1/auth/csrf", "/oauth2/authorization/google", "/login/oauth2/code/google"
        }) {
            var token = mockMvc.perform(get("/api/v1/auth/csrf"))
                    .andExpect(status().isNoContent())
                    .andReturn()
                    .getResponse()
                    .getCookie("XSRF-TOKEN");
            mockMvc.perform(post(path).cookie(token).header("X-XSRF-TOKEN", token.getValue()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().doesNotExist("Location"));
        }
        verifyNoInteractions(identityService);
    }

    @Test
    void authorizationUsesFixedCallbackAndDoesNotCreateLocalIdentity() throws Exception {
        var result = mockMvc.perform(get("/oauth2/authorization/google")
                        .header("Host", "attacker.example")
                        .header("Forwarded", "host=attacker.example;proto=http")
                        .header("X-Forwarded-Host", "attacker.example")
                        .header("X-Forwarded-Proto", "https")
                        .param("redirect_uri", "https://attacker.example/callback")
                        .param("returnTo", "https://attacker.example"))
                .andExpect(status().isFound())
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        assertThat(URI.create(location).getHost()).isEqualTo("host.docker.internal");
        String query = URLDecoder.decode(URI.create(location).getRawQuery(), StandardCharsets.UTF_8);
        assertThat(query)
                .contains(
                        "redirect_uri=http://127.0.0.1:5173/login/oauth2/code/google",
                        "response_type=code",
                        "state=",
                        "nonce=")
                .doesNotContain("attacker.example");
        assertThat(result.getRequest().getSession(false)).isNotNull();
        verifyNoInteractions(identityService);
    }

    @Test
    void orphanCallbackAndProviderCancellationReturnOnlyFixedSafeError() throws Exception {
        mockMvc.perform(get("/login/oauth2/code/google")
                        .param("code", "fictitious-code")
                        .param("state", "uncorrelated-state")
                        .param("next", "https://attacker.example"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/login?error=authentication"));
        mockMvc.perform(get("/login/oauth2/code/google")
                        .param("error", "access_denied")
                        .param("error_description", "provider-detail-must-not-be-reflected"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/login?error=authentication"));
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        verifyNoInteractions(identityService);
    }

    @Test
    void bearerTokensAreNotAcceptedAndAnonymousFailuresAreNotSavedForRedirects() throws Exception {
        var result = mockMvc.perform(get("/api/v1/stores").header("Authorization", "Bearer fictitious-token"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        var session = result.getRequest().getSession(false);
        assertThat(session == null || session.getAttribute("SPRING_SECURITY_SAVED_REQUEST") == null)
                .isTrue();
    }
}
