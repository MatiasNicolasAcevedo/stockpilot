package server.server.security;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;

/** No discovery on startup, no real-to-local fallback, and only one registration. */
@Configuration(proxyBeanMethods = false)
public class OidcConfiguration {
    @Bean
    PublicOrigin publicOrigin(Environment environment) {
        return PublicOrigin.parse(required(environment, "APP_PUBLIC_URL"));
    }

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(Environment environment, PublicOrigin origin) {
        Set<String> profiles = Set.copyOf(Arrays.asList(
                environment.getActiveProfiles().length == 0
                        ? environment.getDefaultProfiles()
                        : environment.getActiveProfiles()));
        boolean local = profiles.contains("test") || profiles.contains("e2e");
        if ((local && profiles.contains("google")) || (!local && !profiles.contains("google"))) {
            throw new IllegalStateException("Choose google or test/e2e OIDC profiles exclusively");
        }
        ClientRegistration.Builder registration = ClientRegistration.withRegistrationId("google")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .redirectUri(origin.callback())
                .scope("openid", "profile", "email")
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .clientName("Google");
        if (local) {
            String issuer = localIssuer(required(environment, "stockpilot.oidc.local-issuer"));
            registration
                    .clientId(required(environment, "stockpilot.oidc.local-client-id"))
                    .clientSecret(required(environment, "stockpilot.oidc.local-client-secret"))
                    .issuerUri(issuer)
                    .authorizationUri(issuer + "/authorize")
                    .tokenUri(issuer + "/token")
                    .jwkSetUri(issuer + "/jwks")
                    .userInfoUri(issuer + "/userinfo");
        } else {
            registration
                    .clientId(required(environment, "GOOGLE_CLIENT_ID"))
                    .clientSecret(required(environment, "GOOGLE_CLIENT_SECRET"))
                    .issuerUri("https://accounts.google.com")
                    .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                    .tokenUri("https://oauth2.googleapis.com/token")
                    .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                    .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo");
        }
        return new InMemoryClientRegistrationRepository(registration.build());
    }

    @Bean
    OAuth2AuthorizedClientRepository authorizedClientRepository() {
        return new HttpSessionOAuth2AuthorizedClientRepository();
    }

    @Bean
    ServletContextInitializer sessionCookieSecurity(PublicOrigin origin) {
        return context -> context.getSessionCookieConfig().setSecure(origin.secure());
    }

    private static String required(Environment environment, String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required OIDC configuration: " + key);
        }
        return value;
    }

    private static String localIssuer(String value) {
        try {
            URI uri = URI.create(value);
            if (uri.getHost() == null
                    || uri.getRawUserInfo() != null
                    || uri.getRawQuery() != null
                    || uri.getRawFragment() != null
                    || value.endsWith("/")
                    || !("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))) {
                throw new IllegalArgumentException();
            }
            return value;
        } catch (RuntimeException failure) {
            throw new IllegalArgumentException("Invalid local OIDC issuer configuration");
        }
    }
}
