package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static server.server.security.OidcHttpBrowser.success;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.MountableFile;
import server.server.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

/** Real Spring/Tomcat/PostgreSQL and the owner-authorized 3.0.3 provider, without auth mocks. */
@ActiveProfiles("test")
@Testcontainers
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class OidcLoginIT {
    @Container
    static final GenericContainer<?> PROVIDER = new GenericContainer<>("ghcr.io/navikt/mock-oauth2-server:3.0.3")
            .withEnv("SERVER_PORT", "8090")
            .withEnv("JSON_CONFIG_PATH", "/config/oidc.json")
            .withCopyFileToContainer(MountableFile.forClasspathResource("oidc/oidc.json"), "/config/oidc.json")
            .withExposedPorts(8090)
            .waitingFor(
                    Wait.forHttp("/default/.well-known/openid-configuration").forStatusCode(200));

    @DynamicPropertySource
    static void providerProperties(DynamicPropertyRegistry registry) {
        registry.add("stockpilot.oidc.local-issuer", OidcLoginIT::issuer);
    }

    private static String issuer() {
        return "http://" + PROVIDER.getHost() + ":" + PROVIDER.getMappedPort(8090) + "/default";
    }

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void cleanupOwnIdentity() {
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", issuer());
    }

    @Test
    void realProviderLoginRepeatedLoginAndReloadKeepOneLocalIdentityAndRotateSession() throws Exception {
        var browser = new OidcHttpBrowser(port);
        var discovery = browser.external(java.net.URI.create(issuer() + "/.well-known/openid-configuration"));
        assertThat(discovery.statusCode()).isEqualTo(200);
        var metadata = JsonMapper.builder().build().readTree(discovery.body());
        assertThat(metadata.get("issuer").asString()).isEqualTo(issuer());
        for (var endpoint : Map.of(
                        "authorization_endpoint",
                        "authorize",
                        "token_endpoint",
                        "token",
                        "jwks_uri",
                        "jwks",
                        "userinfo_endpoint",
                        "userinfo")
                .entrySet()) {
            assertThat(metadata.get(endpoint.getKey()).asString()).isEqualTo(issuer() + "/" + endpoint.getValue());
        }
        browser.anonymous();
        var authorization = browser.start();
        assertThat(authorization.toString().startsWith(issuer() + "/authorize?"))
                .isTrue();
        String anonymousSession = browser.cookie("JSESSIONID");
        assertThat(rows()).isZero();
        success(browser.callback(browser.authorize(authorization)));
        assertThat(!anonymousSession.equals(browser.cookie("JSESSIONID"))).isTrue();
        var me = browser.me();
        UUID id = UUID.fromString(me.get("id").asString());
        assertThat(id.version()).isEqualTo(7);
        assertThat(me.get("displayName").asString()).isEqualTo("Persona Demo");
        assertThat(me.get("email").asString()).isEqualTo("persona@example.com");
        assertThat(me.get("emailVerified").asBoolean()).isTrue();
        assertThat(rows()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT subject FROM app_user WHERE id = ?", String.class, id))
                .isEqualTo("oidc-it-fictitious-person");
        var createdAt =
                jdbc.queryForObject("SELECT created_at FROM app_user WHERE id = ?", java.time.OffsetDateTime.class, id);

        var stale = new OidcHttpBrowser(port);
        stale.cookie("JSESSIONID", anonymousSession);
        stale.anonymous();
        var reload = new OidcHttpBrowser(port);
        reload.cookie("JSESSIONID", browser.cookie("JSESSIONID"));
        assertThat(reload.me().get("id").asString()).isEqualTo(id.toString());
        assertThat(reload.get("/api/v1/commerces").statusCode()).isEqualTo(403);

        String authenticatedSession = browser.cookie("JSESSIONID");
        success(browser.callback(browser.authorize(browser.start())));
        assertThat(!authenticatedSession.equals(browser.cookie("JSESSIONID"))).isTrue();
        assertThat(browser.me().get("id").asString()).isEqualTo(id.toString());
        assertThat(rows()).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                        "SELECT created_at FROM app_user WHERE id = ?", java.time.OffsetDateTime.class, id))
                .isEqualTo(createdAt);
    }

    @Test
    void realLoginAndLogoutRotateCsrfRejectStaleHeadersAndInvalidateSessionWithoutDeletingIdentity() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        String beforeLogin = browser.cookie("XSRF-TOKEN");
        var callback = browser.authorize(browser.start());
        var login = browser.callback(callback);
        success(login);
        OidcHttpBrowser.assertCookieDeleted(login, "XSRF-TOKEN");
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        String afterLogin = browser.cookie("XSRF-TOKEN");
        assertThat(afterLogin != null && !afterLogin.equals(beforeLogin)).isTrue();
        String session = browser.cookie("JSESSIONID");
        String id = browser.me().get("id").asString();
        assertThat(browser.get("/logout").statusCode()).isEqualTo(405);
        assertThat(browser.me().get("id").asString()).isEqualTo(id);
        assertThat(browser.post("/logout", Map.of()).statusCode()).isEqualTo(403);
        assertThat(browser.post("/logout", Map.of("X-XSRF-TOKEN", "incorrect")).statusCode())
                .isEqualTo(403);
        assertThat(browser.post("/logout", Map.of("X-XSRF-TOKEN", beforeLogin)).statusCode())
                .isEqualTo(403);
        assertThat(browser.me().get("id").asString()).isEqualTo(id);
        var logout = browser.post("/logout", Map.of("X-XSRF-TOKEN", afterLogin));
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(logout.body()).isEmpty();
        assertThat(logout.headers().allValues("Location")).isEmpty();
        OidcHttpBrowser.assertNoStore(logout);
        for (String name : new String[] {"JSESSIONID", "XSRF-TOKEN"}) {
            OidcHttpBrowser.assertCookieDeleted(logout, name);
            assertThat(browser.cookie(name)).isNull();
        }
        browser.anonymous();
        var stale = new OidcHttpBrowser(port);
        stale.cookie("JSESSIONID", session);
        stale.anonymous();
        assertThat(rows()).isEqualTo(1);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        String afterLogout = browser.cookie("XSRF-TOKEN");
        assertThat(afterLogout != null && !afterLogout.equals(afterLogin)).isTrue();
        assertThat(browser.post("/logout", Map.of("X-XSRF-TOKEN", afterLogin)).statusCode())
                .isEqualTo(403);
        assertThat(browser.post("/logout", Map.of("X-XSRF-TOKEN", afterLogout)).statusCode())
                .isEqualTo(204);
        assertThat(browser.get("/logout").statusCode()).isEqualTo(401);
        OidcHttpBrowser.failure(browser.callback(callback));
        browser.anonymous();
        assertThat(rows()).isEqualTo(1);
    }

    private int rows() {
        return jdbc.queryForObject("SELECT count(*) FROM app_user WHERE issuer = ?", Integer.class, issuer());
    }
}
