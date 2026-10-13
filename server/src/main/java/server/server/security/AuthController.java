package server.server.security;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class AuthController {
    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store").body(user.identity());
    }

    @GetMapping("/api/v1/auth/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }

    @GetMapping("/logout")
    public ResponseEntity<Void> logoutGet() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .header(HttpHeaders.ALLOW, "POST")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
