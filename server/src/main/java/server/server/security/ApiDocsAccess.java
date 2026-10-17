package server.server.security;

import java.util.Locale;
import java.util.Set;

/**
 * ADR 0003: the OpenAPI document and Swagger UI are opt-in and only for local development on an HTTP loopback public
 * origin. One switch governs springdoc (application.yaml) and the GET-only permission (SecurityConfig).
 */
record ApiDocsAccess(boolean enabled) {
    static final String PROPERTY = "stockpilot.api-docs.enabled";

    /** Exact springdoc routes the UI needs (confirmed over HTTP in T-003 D2); opened for GET only. */
    static final String[] PATHS = {
        "/api/docs/openapi", "/api/docs/openapi/swagger-config", "/api/docs/swagger-ui.html", "/api/docs/swagger-ui/**"
    };

    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "[::1]");

    static ApiDocsAccess from(String value, PublicOrigin origin) {
        boolean enabled = switchValue(value);
        if (enabled && !httpLoopback(origin)) {
            // Fixed message: never echo the configured origin.
            throw new IllegalStateException("STOCKPILOT_API_DOCS_ENABLED requires an HTTP loopback APP_PUBLIC_URL");
        }
        return new ApiDocsAccess(enabled);
    }

    private static boolean switchValue(String value) {
        if (value == null || value.trim().equalsIgnoreCase("false")) {
            return false;
        }
        if (value.trim().equalsIgnoreCase("true")) {
            return true;
        }
        // Anything else would let springdoc read it differently from this switch: refuse, without echoing it.
        throw new IllegalStateException("STOCKPILOT_API_DOCS_ENABLED must be true or false");
    }

    private static boolean httpLoopback(PublicOrigin origin) {
        return "http".equalsIgnoreCase(origin.uri().getScheme())
                && LOOPBACK.contains(origin.uri().getHost().toLowerCase(Locale.ROOT));
    }
}
