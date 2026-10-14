package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static server.server.security.OidcHttpBrowser.failure;
import static server.server.security.OidcHttpBrowser.success;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import server.server.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

/** Negative wire responses only; production's Spring validators, user service and database are real. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class OidcFailureIT {
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();

    @DynamicPropertySource
    static void providerProperties(DynamicPropertyRegistry registry) {
        registry.add("stockpilot.oidc.local-issuer", PROVIDER::issuer);
    }

    @AfterAll
    static void closeProvider() {
        PROVIDER.close();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetFixture() {
        PROVIDER.select(OidcHttpProvider.Variant.VALID);
    }

    @AfterEach
    void cleanupOwnIdentity() {
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    @Test
    void fixturePositiveControlReallyUsesTokenJwksAndUserInfoAndPersistsValidatedIdentity() throws Exception {
        var browser = new OidcHttpBrowser(port);
        var metadataResponse = browser.external(URI.create(PROVIDER.issuer() + "/.well-known/openid-configuration"));
        assertThat(metadataResponse.statusCode()).isEqualTo(200);
        var metadata = JsonMapper.builder().build().readTree(metadataResponse.body());
        assertThat(metadata.get("issuer").asString()).isEqualTo(PROVIDER.issuer());
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
            assertThat(metadata.get(endpoint.getKey()).asString())
                    .isEqualTo(PROVIDER.issuer() + "/" + endpoint.getValue());
        }
        recover(browser);
        assertThat(PROVIDER.jwksCalls.get()).isPositive();
        assertThat(browser.me().get("displayName").asString()).isEqualTo("Persona Fixture");
        assertThat(browser.me().get("email").asString()).isEqualTo("fixture@example.com");
    }

    @ParameterizedTest
    @EnumSource(value = OidcHttpProvider.Variant.class, names = "VALID", mode = EnumSource.Mode.EXCLUDE)
    void invalidTokensResponsesAndDatabaseFailureNeverCreateIdentityOrAuthenticate(OidcHttpProvider.Variant variant)
            throws Exception {
        PROVIDER.select(variant);
        var browser = new OidcHttpBrowser(port);
        failure(browser.callback(browser.authorize(browser.start())));
        browser.anonymous();
        assertThat(rows()).isZero();
        assertThat(PROVIDER.tokenCalls.get()).isEqualTo(1);
        boolean beforeUserInfo = switch (variant) {
            case NONCE_MISSING, NONCE_WRONG, ISSUER_WRONG, AUDIENCE_WRONG, SIGNATURE_WRONG, EXPIRED, TOKEN_ERROR ->
                true;
            default -> false;
        };
        assertThat(PROVIDER.userInfoCalls.get()).isEqualTo(beforeUserInfo ? 0 : 1);
        recover(browser);
    }

    @ParameterizedTest
    @ValueSource(strings = {"absent", "incorrect"})
    void stateMustMatchTheHttpSessionBeforeAnyTokenExchange(String kind) throws Exception {
        var browser = new OidcHttpBrowser(port);
        URI callback = browser.authorize(browser.start());
        var query = OidcHttpBrowser.parameters(callback.getRawQuery());
        if (kind.equals("absent")) query.remove("state");
        else query.put("state", "incorrect-state");
        failure(browser.callback(withQuery(callback, query)));
        browser.anonymous();
        assertThat(rows()).isZero();
        assertThat(PROVIDER.tokenCalls.get()).isZero();
        assertThat(PROVIDER.userInfoCalls.get()).isZero();
        recover(browser);
    }

    @Test
    void cancellationNeverReflectsProviderDetailsAndCanRetryInTheSameBrowser() throws Exception {
        var browser = new OidcHttpBrowser(port);
        var query = OidcHttpBrowser.parameters(browser.start().getRawQuery());
        failure(browser.callback(withQuery(
                URI.create(OidcHttpBrowser.CALLBACK),
                Map.of(
                        "state",
                        query.get("state"),
                        "error",
                        "access_denied",
                        "error_description",
                        "fictitious-private-detail",
                        "returnTo",
                        "https://attacker.example"))));
        browser.anonymous();
        assertThat(rows()).isZero();
        assertThat(PROVIDER.tokenCalls.get()).isZero();
        recover(browser);
    }

    @Test
    void orphanedAndReplayedCallbacksCannotAuthenticateAnotherOrOldSession() throws Exception {
        var original = new OidcHttpBrowser(port);
        URI callback = original.authorize(original.start());
        String oldSession = original.cookie("JSESSIONID");
        var orphan = new OidcHttpBrowser(port);
        failure(orphan.callback(callback));
        orphan.anonymous();
        assertThat(rows()).isZero();
        assertThat(PROVIDER.tokenCalls.get()).isZero();
        success(original.callback(callback));
        String id = original.me().get("id").asString();
        assertThat(rows()).isEqualTo(1);
        assertThat(PROVIDER.tokenCalls.get()).isEqualTo(1);
        var stale = new OidcHttpBrowser(port);
        stale.cookie("JSESSIONID", oldSession);
        failure(stale.callback(callback));
        stale.anonymous();
        failure(orphan.callback(callback));
        orphan.anonymous();
        assertThat(PROVIDER.tokenCalls.get()).isEqualTo(1);
        assertThat(rows()).isEqualTo(1);
        assertThat(original.me().get("id").asString()).isEqualTo(id);
        // The consumed authorization request also rejects replay in the currently logged-in browser.
        failure(original.callback(callback));
        original.anonymous();
        assertThat(PROVIDER.tokenCalls.get()).isEqualTo(1);
        assertThat(rows()).isEqualTo(1);
    }

    private void recover(OidcHttpBrowser browser) throws Exception {
        PROVIDER.select(OidcHttpProvider.Variant.VALID);
        success(browser.callback(browser.authorize(browser.start())));
        browser.me();
        assertThat(rows()).isEqualTo(1);
        assertThat(PROVIDER.tokenCalls.get()).isEqualTo(1);
        assertThat(PROVIDER.userInfoCalls.get()).isEqualTo(1);
    }

    private int rows() {
        return jdbc.queryForObject("SELECT count(*) FROM app_user WHERE issuer = ?", Integer.class, PROVIDER.issuer());
    }

    private static URI withQuery(URI uri, Map<String, String> query) {
        return URI.create(uri.getScheme() + "://" + uri.getRawAuthority() + uri.getPath() + "?"
                + query.entrySet().stream()
                        .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "="
                                + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                        .collect(Collectors.joining("&")));
    }
}
