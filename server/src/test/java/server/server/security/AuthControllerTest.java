package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.context.WebApplicationContext;
import server.server.identity.IdentityService;

/** Cookie/header and session contracts; oidcLogin is a fixture, not evidence of OIDC protocol validation. */
@ActiveProfiles("test")
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private IdentityService identityService;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private PublicOrigin origin;

    @BeforeEach
    void usePublicOrigin() {
        mvc = AuthOriginMockMvc.create(context, origin);
    }

    @Test
    void anonymousMeIs401JsonAndNeverRedirects() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void meReturnsOnlyCurrentLocalIdentity() throws Exception {
        mvc.perform(get("/api/v1/auth/me")
                        .with(oidcLogin()
                                .oidcUser(AuthFixtures.localUser("Persona Demo", "persona@example.com", true))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content()
                        .json(
                                "{\"id\":\"" + AuthFixtures.USER_ID
                                        + "\",\"displayName\":\"Persona Demo\",\"email\":\"persona@example.com\",\"emailVerified\":true}",
                                org.springframework.test.json.JsonCompareMode.STRICT));
    }

    @Test
    void mePreservesNullableAttributesAndFalseVerification() throws Exception {
        mvc.perform(get("/api/v1/auth/me").with(oidcLogin().oidcUser(AuthFixtures.localUser(null, null, false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value(nullValue()))
                .andExpect(jsonPath("$.email").value(nullValue()))
                .andExpect(jsonPath("$.emailVerified").value(false));
    }

    @Test
    void providerOnlyFixtureCannotImpersonateLocalIdentity() throws Exception {
        mvc.perform(get("/api/v1/auth/me").with(oidcLogin()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void csrfIsPublic204AndCookieIsReadableHostOnlyAndNonPersistent() throws Exception {
        MvcResult result = mvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isNotBlank();
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getDomain()).isNull();
        assertThat(cookie.isHttpOnly()).isFalse();
        assertThat(cookie.getSecure()).isFalse();
        assertThat(cookie.getMaxAge()).isEqualTo(-1);
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        mvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRejectsMissingOrWrongCsrfEvenWithoutASession() throws Exception {
        Cookie token = csrfCookie();
        mvc.perform(post("/logout"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        mvc.perform(post("/logout").cookie(token).header("X-XSRF-TOKEN", "wrong"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void logoutIgnoresCsrfInQueryString() throws Exception {
        Cookie token = csrfCookie();
        mvc.perform(post("/logout").cookie(token).queryParam("_csrf", token.getValue()))
                .andExpect(status().isForbidden());
        var result = mvc.perform(get("/api/v1/auth/csrf").cookie(token)).andReturn();
        var masked = (org.springframework.security.web.csrf.CsrfToken)
                result.getRequest().getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
        mvc.perform(post("/logout").cookie(token).queryParam("_csrf", masked.getToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousLogoutWithRealCookieHeaderPairIs204Idempotent() throws Exception {
        Cookie token = csrfCookie();
        mvc.perform(post("/logout").cookie(token).header("X-XSRF-TOKEN", token.getValue()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(header().doesNotExist("Location"));
        Cookie next = csrfCookie();
        mvc.perform(post("/logout").cookie(next).header("X-XSRF-TOKEN", next.getValue()))
                .andExpect(status().isNoContent());
    }

    @Test
    void logoutInvalidatesSessionContextAndDeletesBothCookies() throws Exception {
        MvcResult me = mvc.perform(
                        get("/api/v1/auth/me").with(oidcLogin().oidcUser(AuthFixtures.localUser("Demo", null, false))))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) me.getRequest().getSession(false);
        SecurityContext context = (SecurityContext)
                session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        Cookie token = csrfCookie();
        MvcResult logout = mvc.perform(
                        post("/logout").session(session).cookie(token).header("X-XSRF-TOKEN", token.getValue()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();
        assertThat(session.isInvalid()).isTrue();
        assertThat(context.getAuthentication()).isNull();
        for (String name : new String[] {"JSESSIONID", "XSRF-TOKEN"}) {
            Cookie deleted = logout.getResponse().getCookie(name);
            assertThat(deleted).isNotNull();
            assertThat(deleted.getMaxAge()).isZero();
            assertThat(deleted.getPath()).isEqualTo("/");
            assertThat(deleted.getDomain()).isNull();
            assertThat(deleted.getAttribute("SameSite")).isEqualTo("Lax");
        }
        mvc.perform(get("/api/v1/auth/me").cookie(new Cookie("JSESSIONID", session.getId())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void freshCsrfAfterLogoutRejectsOldHeaderWithCurrentCookie() throws Exception {
        Cookie old = csrfCookie();
        mvc.perform(post("/logout").cookie(old).header("X-XSRF-TOKEN", old.getValue()))
                .andExpect(status().isNoContent());
        Cookie fresh = csrfCookie();
        assertThat(fresh.getValue()).isNotEqualTo(old.getValue());
        mvc.perform(post("/logout").cookie(fresh).header("X-XSRF-TOKEN", old.getValue()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/logout").cookie(fresh).header("X-XSRF-TOKEN", fresh.getValue()))
                .andExpect(status().isNoContent());
    }

    @Test
    void getLogoutNeverLogsOutOrShowsAForm() throws Exception {
        mvc.perform(get("/logout")).andExpect(status().isUnauthorized());
        MvcResult result = mvc.perform(
                        get("/logout").with(oidcLogin().oidcUser(AuthFixtures.localUser("Demo", null, false))))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "POST"))
                .andExpect(content().string(""))
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session.isInvalid()).isFalse();
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk());
    }

    private Cookie csrfCookie() throws Exception {
        return mvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
    }
}
