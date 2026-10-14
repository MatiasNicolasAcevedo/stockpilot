package server.server.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import server.server.identity.IdentityProfile;
import server.server.identity.IdentityService;

/** Called by Spring only after ID token validation; delegate also validates UserInfo correlation. */
@Service
public class LocalOidcUserService implements OAuth2UserService<OidcUserRequest, OidcUser> {
    private final IdentityService identities;
    private final OAuth2UserService<OidcUserRequest, OidcUser> delegate;

    @Autowired
    public LocalOidcUserService(IdentityService identities) {
        this(identities, new OidcUserService());
    }

    LocalOidcUserService(IdentityService identities, OAuth2UserService<OidcUserRequest, OidcUser> delegate) {
        this.identities = identities;
        this.delegate = delegate;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest request) throws OAuth2AuthenticationException {
        OidcUser validated;
        try {
            validated = delegate.loadUser(request);
        } catch (OAuth2AuthenticationException failure) {
            throw failure;
        } catch (RuntimeException failure) {
            // Malformed UserInfo can throw before Spring wraps it as an authentication failure.
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_user_info_response"), "No se pudo iniciar sesión.");
        }
        try {
            var token = request.getIdToken();
            var user = identities.resolve(new IdentityProfile(
                    token.getIssuer().toExternalForm(),
                    token.getSubject(),
                    validated.getEmail(),
                    validated.getEmailVerified(),
                    validated.getFullName()));
            return new LocalOidcUser(
                    validated,
                    new AuthMeResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.isEmailVerified()));
        } catch (RuntimeException failure) {
            // Fail authentication closed; never attach DB messages or claims to a logged exception.
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("local_identity_failed"), "No se pudo iniciar sesión.");
        }
    }
}
