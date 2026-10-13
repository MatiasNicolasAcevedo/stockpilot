package server.server.security;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

final class AuthFixtures {
    static final UUID USER_ID = UUID.fromString("01900000-0000-7000-8000-000000000001");

    static LocalOidcUser localUser(String name, String email, boolean verified) {
        var token = token();
        var validated = new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), token);
        return new LocalOidcUser(validated, new AuthMeResponse(USER_ID, name, email, verified));
    }

    static OidcIdToken token() {
        return OidcIdToken.withTokenValue("fictitious-id-token")
                .issuer("https://accounts.google.com")
                .subject("subject-demo")
                .issuedAt(Instant.parse("2026-10-13T10:00:00Z"))
                .expiresAt(Instant.parse("2026-10-13T11:00:00Z"))
                .build();
    }
}
