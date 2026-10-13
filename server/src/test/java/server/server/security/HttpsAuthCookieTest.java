package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import server.server.identity.IdentityService;

/** HTTPS cookie configuration in a slice, not a TLS deployment or proxy protocol test. */
@ActiveProfiles("test")
@WebMvcTest(value = AuthController.class, properties = "APP_PUBLIC_URL=https://demo.example:8443")
@Import(SecurityConfig.class)
class HttpsAuthCookieTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private IdentityService identities;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private PublicOrigin origin;

    @BeforeEach
    void usePublicOrigin() {
        mvc = AuthOriginMockMvc.create(context, origin);
    }

    @Test
    void csrfAndDeletedCookiesRemainSecureRegardlessOfSpoofedProtoHeader() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf").header("X-Forwarded-Proto", "http"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        assertThat(csrf.getSecure()).isTrue();
        var response = mvc.perform(post("/logout")
                        .cookie(csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue())
                        .header("X-Forwarded-Proto", "http"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse();
        assertThat(response.getCookie("JSESSIONID").getSecure()).isTrue();
        assertThat(response.getCookie("JSESSIONID").isHttpOnly()).isTrue();
        assertThat(response.getCookie("XSRF-TOKEN").getSecure()).isTrue();
        assertThat(response.getCookie("XSRF-TOKEN").isHttpOnly()).isFalse();
    }
}
