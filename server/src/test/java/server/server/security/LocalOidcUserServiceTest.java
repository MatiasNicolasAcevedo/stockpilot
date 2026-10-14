package server.server.security;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import server.server.identity.AppUser;
import server.server.identity.IdentityProfile;
import server.server.identity.IdentityService;

class LocalOidcUserServiceTest {
    private final IdentityService identities = mock(IdentityService.class);

    @SuppressWarnings("unchecked")
    private final OAuth2UserService<OidcUserRequest, OidcUser> delegate = mock(OAuth2UserService.class);

    private final LocalOidcUserService service = new LocalOidcUserService(identities, delegate);

    @Test
    void resolvesLocalIdentityOnlyAfterDelegateAndDoesNotGrantClaimAuthorities() {
        var request = request();
        var info = OidcUserInfo.builder()
                .subject("subject-demo")
                .email("persona@example.com")
                .emailVerified(true)
                .name("Persona Demo")
                .claim("iss", "https://untrusted.example")
                .build();
        var validated =
                new DefaultOidcUser(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")), request.getIdToken(), info);
        var local = spy(new AppUser(
                "https://accounts.google.com",
                "subject-demo",
                "persona@example.com",
                true,
                "Persona Demo",
                Instant.EPOCH));
        when(local.getId()).thenReturn(AuthFixtures.USER_ID);
        when(delegate.loadUser(request)).thenReturn(validated);
        when(identities.resolve(any())).thenReturn(local);

        var result = (LocalOidcUser) service.loadUser(request);

        var order = inOrder(delegate, identities);
        order.verify(delegate).loadUser(request);
        order.verify(identities)
                .resolve(new IdentityProfile(
                        "https://accounts.google.com", "subject-demo", "persona@example.com", true, "Persona Demo"));
        assertThat(result.identity())
                .isEqualTo(new AuthMeResponse(local.getId(), "Persona Demo", "persona@example.com", true));
        assertThat(result.getName()).isEqualTo(local.getId().toString());
        assertThat(result.getAuthorities()).extracting("authority").containsExactly("OIDC_USER");
        assertThat(result.toString()).doesNotContain("persona", "token", "subject-demo");
    }

    @Test
    void delegateFailureNeverCreatesALocalIdentity() {
        var request = request();
        var failure = new OAuth2AuthenticationException(new OAuth2Error("invalid_user_info_response"));
        when(delegate.loadUser(request)).thenThrow(failure);
        assertThatThrownBy(() -> service.loadUser(request)).isSameAs(failure);
        verifyNoInteractions(identities);
    }

    @Test
    void malformedUserInfoFailureIsSanitizedWithoutResolvingAnIdentity() {
        var request = request();
        when(delegate.loadUser(request)).thenThrow(new IllegalArgumentException("sensitive-provider-detail"));
        assertThatThrownBy(() -> service.loadUser(request))
                .isInstanceOfSatisfying(OAuth2AuthenticationException.class, failure -> {
                    assertThat(failure.getError().getErrorCode()).isEqualTo("invalid_user_info_response");
                    assertThat(failure).hasMessage("No se pudo iniciar sesión.").hasNoCause();
                });
        verifyNoInteractions(identities);
    }

    @Test
    void absentProfileAttributesRemainNullableWithoutBlockingLogin() {
        var request = request();
        when(delegate.loadUser(request))
                .thenReturn(
                        new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), request.getIdToken()));
        var local = spy(new AppUser("https://accounts.google.com", "subject-demo", null, false, null, Instant.EPOCH));
        when(local.getId()).thenReturn(AuthFixtures.USER_ID);
        when(identities.resolve(new IdentityProfile("https://accounts.google.com", "subject-demo", null, null, null)))
                .thenReturn(local);
        var result = (LocalOidcUser) service.loadUser(request);
        assertThat(result.identity()).isEqualTo(new AuthMeResponse(local.getId(), null, null, false));
    }

    @Test
    void persistenceFailureBecomesSafeAuthenticationFailureWithNoCauseOrClaims() {
        var request = request();
        when(delegate.loadUser(request))
                .thenReturn(
                        new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), request.getIdToken()));
        when(identities.resolve(any())).thenThrow(new IllegalStateException("sensitive-database-detail"));
        assertThatThrownBy(() -> service.loadUser(request))
                .isInstanceOfSatisfying(OAuth2AuthenticationException.class, failure -> {
                    assertThat(failure.getError().getErrorCode()).isEqualTo("local_identity_failed");
                    assertThat(failure).hasMessage("No se pudo iniciar sesión.").hasNoCause();
                });
    }

    private OidcUserRequest request() {
        var registration = ClientRegistration.withRegistrationId("google")
                .clientId("fictitious-id")
                .clientSecret("fictitious-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("http://127.0.0.1:5173/login/oauth2/code/google")
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .userNameAttributeName("sub")
                .issuerUri("https://accounts.google.com")
                .build();
        var access = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                "fictitious-access-token",
                Instant.EPOCH,
                Instant.EPOCH.plusSeconds(3600));
        return new OidcUserRequest(registration, access, AuthFixtures.token());
    }
}
