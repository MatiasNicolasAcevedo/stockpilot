package server.server.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
@Tag(name = AuthOpenApi.TAG, description = "Sesión del backend con Google OIDC y protección CSRF (S-001)")
public class AuthController {
    @Operation(
            summary = "Usuario de la sesión actual",
            description = "Identidad local mínima; nunca issuer, subject, tokens ni roles. Respuesta no-store.",
            security = @SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE))
    @ApiResponse(responseCode = "200", description = "Sesión activa")
    @ApiResponse(
            responseCode = "401",
            description = "Sin sesión (visitante); sin redirect",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store").body(user.identity());
    }

    @Operation(
            summary = "Materializa la cookie CSRF",
            description = "Visitante o autenticado. Escribe la cookie XSRF-TOKEN si falta; no cambia identidad ni da"
                    + " acceso. La SPA la pide al montar, tras autenticar y tras cerrar sesión.")
    @ApiResponse(responseCode = "204", description = "Cookie XSRF-TOKEN vigente; sin cuerpo")
    @GetMapping("/api/v1/auth/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }

    @Operation(
            summary = "GET no cierra sesión",
            description = "Solo POST /logout con CSRF cierra la sesión; GET no tiene efectos ni muestra formulario.",
            security = @SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE))
    @ApiResponse(responseCode = "405", description = "Con sesión: método no permitido (Allow: POST)")
    @ApiResponse(
            responseCode = "401",
            description = "Sin sesión",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @GetMapping("/logout")
    public ResponseEntity<Void> logoutGet() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .header(HttpHeaders.ALLOW, "POST")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
