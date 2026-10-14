package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;

/** Startup/profile isolation only. Does not prove provider discovery, networking or token validation. */
class OidcProfileTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(OidcConfiguration.class)
            .withInitializer(context -> context.getEnvironment().setDefaultProfiles("google"))
            .withPropertyValues("APP_PUBLIC_URL=http://127.0.0.1:5173");

    @Test
    void defaultGoogleRegistrationIsFixedAndIgnoresLocalIssuerOverrides() {
        runner.withPropertyValues(
                        "GOOGLE_CLIENT_ID=fictitious-id",
                        "GOOGLE_CLIENT_SECRET=fictitious-secret",
                        "stockpilot.oidc.local-issuer=http://attacker.example/default",
                        "spring.security.oauth2.client.provider.google.issuer-uri=http://attacker.example")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var repository = context.getBean(ClientRegistrationRepository.class);
                    var registration = repository.findByRegistrationId("google");
                    assertThat(repository.findByRegistrationId("other")).isNull();
                    assertThat(registration.getProviderDetails().getIssuerUri())
                            .isEqualTo("https://accounts.google.com");
                    assertThat(registration.getProviderDetails().getAuthorizationUri())
                            .isEqualTo("https://accounts.google.com/o/oauth2/v2/auth");
                    assertThat(registration.getProviderDetails().getJwkSetUri())
                            .isEqualTo("https://www.googleapis.com/oauth2/v3/certs");
                    assertThat(registration.getScopes()).containsExactlyInAnyOrder("openid", "profile", "email");
                    assertThat(registration.getAuthorizationGrantType())
                            .isEqualTo(AuthorizationGrantType.AUTHORIZATION_CODE);
                    assertThat(registration.getRedirectUri())
                            .isEqualTo("http://127.0.0.1:5173/login/oauth2/code/google");
                });
    }

    @Test
    void absentRealCredentialsDoNotSelectConfiguredLocalProvider() {
        local(runner).run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure())
                    .hasRootCauseMessage("Missing required OIDC configuration: GOOGLE_CLIENT_ID");
        });
        runner.withPropertyValues("GOOGLE_CLIENT_ID=fictitious-id").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure())
                    .hasRootCauseMessage("Missing required OIDC configuration: GOOGLE_CLIENT_SECRET");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"test", "e2e"})
    void localProfilesRequireExplicitLocalSettingsAndUseSameRegistrationId(String profile) {
        local(runner.withPropertyValues("spring.profiles.active=" + profile))
                .withInitializer(context -> context.getEnvironment().setActiveProfiles(profile))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var registration =
                            context.getBean(ClientRegistrationRepository.class).findByRegistrationId("google");
                    assertThat(registration.getProviderDetails().getIssuerUri())
                            .isEqualTo("http://host.docker.internal:8090/default");
                    assertThat(registration.getRedirectUri())
                            .isEqualTo("http://127.0.0.1:5173/login/oauth2/code/google");
                });
        runner.withInitializer(context -> context.getEnvironment().setActiveProfiles(profile))
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseMessage("Missing required OIDC configuration: stockpilot.oidc.local-issuer");
                });
    }

    @ParameterizedTest
    @ValueSource(strings = {"test", "e2e"})
    void mixedRealAndLocalProfilesFailBeforeARegistrationIsCreated(String profile) {
        local(runner)
                .withPropertyValues("GOOGLE_CLIENT_ID=fictitious-id", "GOOGLE_CLIENT_SECRET=fictitious-secret")
                .withInitializer(context -> context.getEnvironment().setActiveProfiles("google", profile))
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseMessage("Choose google or test/e2e OIDC profiles exclusively");
                });
    }

    @Test
    void unsupportedProfileFailsRatherThanFallingBack() {
        runner.withInitializer(context -> context.getEnvironment().setActiveProfiles("dev"))
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void missingPublicOriginFailsSafely() {
        runner.withPropertyValues("APP_PUBLIC_URL=").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure())
                    .hasRootCauseMessage("Missing required OIDC configuration: APP_PUBLIC_URL");
        });
    }

    @Test
    void sessionCookieSecureComesFromConfiguredOriginNotRequestHeaders() {
        for (String origin : new String[] {"https://demo.example:8443", "http://127.0.0.1:5173"}) {
            local(runner)
                    .withPropertyValues("APP_PUBLIC_URL=" + origin)
                    .withInitializer(context -> context.getEnvironment().setActiveProfiles("test"))
                    .run(context -> {
                        assertThat(context).hasNotFailed();
                        var servlet = new MockServletContext();
                        context.getBean(ServletContextInitializer.class).onStartup(servlet);
                        assertThat(servlet.getSessionCookieConfig().isSecure()).isEqualTo(origin.startsWith("https:"));
                        assertThat(context.getBean(ClientRegistrationRepository.class)
                                        .findByRegistrationId("google")
                                        .getRedirectUri())
                                .isEqualTo(origin + "/login/oauth2/code/google");
                    });
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                "relative",
                "http://example.com",
                "http://127.0.0.2:5173",
                "https://user:secret@example.com",
                "https://demo.example/",
                "https://demo.example/path",
                "https://demo.example?q=1",
                "https://demo.example#f",
                "https://demo.example:0",
                "https://demo.example:",
                "//demo.example",
                "https://demo.example:65536",
                "ftp://demo.example",
                "http://localhost.evil"
            })
    void malformedOrInsecurePublicOriginsAreRejectedWithoutEchoingInput(String origin) {
        assertThatThrownBy(() -> PublicOrigin.parse(origin))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("APP_PUBLIC_URL must be an HTTPS origin or an HTTP loopback origin without a path");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "https://demo.example",
                "https://demo.example:8443",
                "http://localhost:5173",
                "http://127.0.0.1:5174",
                "http://[::1]:5173"
            })
    void acceptedOriginsFixCallbackAndCookieSecurity(String origin) {
        var configured = PublicOrigin.parse(origin);
        assertThat(configured.callback()).isEqualTo(origin + "/login/oauth2/code/google");
        assertThat(configured.secure()).isEqualTo(origin.startsWith("https:"));
    }

    private ApplicationContextRunner local(ApplicationContextRunner context) {
        return context.withPropertyValues(
                "stockpilot.oidc.local-issuer=http://host.docker.internal:8090/default",
                "stockpilot.oidc.local-client-id=stockpilot-test",
                "stockpilot.oidc.local-client-secret=fictitious-test-only");
    }
}
