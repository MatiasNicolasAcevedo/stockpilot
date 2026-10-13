package server.server.security;

import java.net.URI;
import java.util.Locale;

/** Validated public origin. Never reconstructed from an untrusted request header. */
public record PublicOrigin(URI uri) {
    public PublicOrigin {
        if (uri == null
                || !uri.isAbsolute()
                || uri.getHost() == null
                || uri.getRawAuthority().endsWith(":")
                || uri.getRawUserInfo() != null
                || uri.getRawQuery() != null
                || uri.getRawFragment() != null
                || (uri.getRawPath() != null && !uri.getRawPath().isEmpty())
                || uri.getPort() < -1
                || uri.getPort() == 0
                || uri.getPort() > 65535) {
            throw invalid();
        }
        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        boolean loopback = host.equals("localhost") || host.equals("127.0.0.1") || host.equals("[::1]");
        if (!scheme.equals("https") && !(scheme.equals("http") && loopback)) {
            throw invalid();
        }
    }

    public static PublicOrigin parse(String value) {
        try {
            return new PublicOrigin(URI.create(value));
        } catch (RuntimeException failure) {
            // Do not include supplied configuration in startup errors.
            throw invalid();
        }
    }

    public boolean secure() {
        return "https".equalsIgnoreCase(uri.getScheme());
    }

    public String callback() {
        return uri.toASCIIString() + "/login/oauth2/code/google";
    }

    public boolean matches(String scheme, String host, int port) {
        int publicPort = uri.getPort() == -1 ? (secure() ? 443 : 80) : uri.getPort();
        return uri.getScheme().equalsIgnoreCase(scheme) && uri.getHost().equalsIgnoreCase(host) && publicPort == port;
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException(
                "APP_PUBLIC_URL must be an HTTPS origin or an HTTP loopback origin without a path");
    }
}
