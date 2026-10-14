package server.server.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.web.filter.OncePerRequestFilter;

/** Runs after the servlet framework forwarding filter, before any auth/session/CSRF side effect. */
final class PublicOriginFilter extends OncePerRequestFilter {
    private final PublicOrigin origin;

    PublicOriginFilter(PublicOrigin origin) {
        this.origin = origin;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !(path.equals("/api/v1/auth")
                || path.startsWith("/api/v1/auth/")
                || path.equals("/oauth2")
                || path.startsWith("/oauth2/")
                || path.equals("/login/oauth2/code")
                || path.startsWith("/login/oauth2/code/")
                || path.equals("/logout")
                || path.startsWith("/logout/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getContextPath().isEmpty()
                || !origin.matches(request.getScheme(), request.getServerName(), request.getServerPort())) {
            response.setStatus(400);
            response.setContentType("application/problem+json");
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setHeader("Cache-Control", "no-store");
            response.getWriter()
                    .write(
                            "{\"type\":\"about:blank\",\"title\":\"Bad Request\",\"status\":400,\"detail\":\"Origen de solicitud inválido.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
