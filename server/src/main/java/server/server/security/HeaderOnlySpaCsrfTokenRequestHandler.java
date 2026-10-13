package server.server.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.function.Supplier;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;

/** SPA cookie/header transport, retaining masked request attributes but refusing token query parameters. */
final class HeaderOnlySpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
    private final XorCsrfTokenRequestAttributeHandler attributes = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> token) {
        attributes.handle(request, response, token);
        token.get();
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken token) {
        return request.getHeader(token.getHeaderName());
    }
}
