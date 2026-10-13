package server.server.security;

import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

/** Backend session principal; its provider data must never be serialized as an API response. */
public final class LocalOidcUser implements OidcUser {
    @Serial
    private static final long serialVersionUID = 1L;

    private final OidcUser validatedUser;
    private final AuthMeResponse identity;

    public LocalOidcUser(OidcUser validatedUser, AuthMeResponse identity) {
        this.validatedUser = validatedUser;
        this.identity = identity;
    }

    public AuthMeResponse identity() {
        return identity;
    }

    @Override
    public String getName() {
        return identity.id().toString();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("OIDC_USER"));
    }

    @Override
    public Map<String, Object> getAttributes() {
        return validatedUser.getAttributes();
    }

    @Override
    public Map<String, Object> getClaims() {
        return validatedUser.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return validatedUser.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return validatedUser.getIdToken();
    }

    @Override
    public String toString() {
        return "LocalOidcUser";
    }
}
