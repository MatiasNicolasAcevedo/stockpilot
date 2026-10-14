package server.server.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import tools.jackson.databind.json.JsonMapper;

/** Test-only OIDC wire fixture. Spring performs every exchange and validation using HTTP and JWKS. */
final class OidcHttpProvider implements AutoCloseable {
    enum Variant {
        VALID,
        NONCE_MISSING,
        NONCE_WRONG,
        ISSUER_WRONG,
        AUDIENCE_WRONG,
        SIGNATURE_WRONG,
        EXPIRED,
        USERINFO_SUB_WRONG,
        USERINFO_SUB_MISSING,
        USERINFO_ERROR,
        TOKEN_ERROR,
        DB_CONSTRAINT
    }

    private record Grant(Variant variant, String nonce, String subject) {}

    private final HttpServer server;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final RSAKey key;
    private final RSAKey wrongKey;
    private final Map<String, Grant> codes = new ConcurrentHashMap<>();
    private final Map<String, Grant> accessTokens = new ConcurrentHashMap<>();
    private final AtomicInteger subjects = new AtomicInteger();
    final AtomicInteger tokenCalls = new AtomicInteger();
    final AtomicInteger userInfoCalls = new AtomicInteger();
    final AtomicInteger jwksCalls = new AtomicInteger();
    private volatile Variant variant = Variant.VALID;

    OidcHttpProvider() {
        try {
            key = new RSAKeyGenerator(2048).keyID("test-signing-key").generate();
            wrongKey = new RSAKeyGenerator(2048).keyID("test-signing-key").generate();
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(executor);
            server.createContext("/default/", this::handle);
            server.start();
        } catch (IOException | JOSEException failure) {
            executor.close();
            throw new IllegalStateException("Cannot start fictitious OIDC fixture");
        }
    }

    String issuer() {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/default";
    }

    void select(Variant value) {
        variant = value;
        codes.clear();
        accessTokens.clear();
        tokenCalls.set(0);
        userInfoCalls.set(0);
    }

    private void handle(HttpExchange exchange) throws IOException {
        try {
            switch (exchange.getRequestURI().getPath()) {
                case "/default/.well-known/openid-configuration" ->
                    json(
                            exchange,
                            200,
                            Map.of(
                                    "issuer",
                                    issuer(),
                                    "authorization_endpoint",
                                    issuer() + "/authorize",
                                    "token_endpoint",
                                    issuer() + "/token",
                                    "jwks_uri",
                                    issuer() + "/jwks",
                                    "userinfo_endpoint",
                                    issuer() + "/userinfo",
                                    "response_types_supported",
                                    new String[] {"code"},
                                    "subject_types_supported",
                                    new String[] {"public"},
                                    "id_token_signing_alg_values_supported",
                                    new String[] {"RS256"}));
                case "/default/authorize" -> authorize(exchange);
                case "/default/token" -> token(exchange);
                case "/default/jwks" -> {
                    require("GET".equals(exchange.getRequestMethod()));
                    jwksCalls.incrementAndGet();
                    json(exchange, 200, new JWKSet(key.toPublicJWK()).toJSONObject());
                }
                case "/default/userinfo" -> userInfo(exchange);
                default -> json(exchange, 404, Map.of("error", "not_found"));
            }
        } catch (Exception failure) {
            // Do not print wire data or attach claims/codes/credentials to exceptions or logs.
            json(exchange, 500, Map.of("error", "test_fixture_failed"));
        } finally {
            exchange.close();
        }
    }

    private void authorize(HttpExchange exchange) throws IOException {
        require("GET".equals(exchange.getRequestMethod()));
        var query = OidcHttpBrowser.parameters(exchange.getRequestURI().getRawQuery());
        require("code".equals(query.get("response_type")));
        require("stockpilot-test".equals(query.get("client_id")));
        require(OidcHttpBrowser.CALLBACK.equals(query.get("redirect_uri")));
        require(query.containsKey("state") && query.containsKey("nonce"));
        String code = UUID.randomUUID().toString();
        String subject = "oidc-fixture-" + subjects.incrementAndGet();
        if (variant == Variant.DB_CONSTRAINT) subject = "oidc-fixture-" + "x".repeat(300);
        codes.put(code, new Grant(variant, query.get("nonce"), subject));
        exchange.getResponseHeaders()
                .set(
                        "Location",
                        OidcHttpBrowser.CALLBACK + "?code=" + code + "&state="
                                + URLEncoder.encode(query.get("state"), StandardCharsets.UTF_8));
        exchange.sendResponseHeaders(302, -1);
    }

    private void token(HttpExchange exchange) throws Exception {
        tokenCalls.incrementAndGet();
        require("POST".equals(exchange.getRequestMethod()));
        require(("Basic "
                        + Base64.getEncoder()
                                .encodeToString(
                                        "stockpilot-test:fictitious-test-only".getBytes(StandardCharsets.UTF_8)))
                .equals(exchange.getRequestHeaders().getFirst("Authorization")));
        var form = OidcHttpBrowser.parameters(
                new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
        require("authorization_code".equals(form.get("grant_type")));
        require(OidcHttpBrowser.CALLBACK.equals(form.get("redirect_uri")));
        Grant grant = codes.remove(form.get("code"));
        if (grant == null || grant.variant() == Variant.TOKEN_ERROR) {
            json(exchange, 400, Map.of("error", "invalid_grant", "error_description", "fictitious-private-detail"));
            return;
        }
        var claims = new JWTClaimsSet.Builder()
                .issuer(grant.variant() == Variant.ISSUER_WRONG ? "https://wrong-issuer.example" : issuer())
                .audience(grant.variant() == Variant.AUDIENCE_WRONG ? "another-client" : "stockpilot-test")
                .subject(grant.subject())
                .issueTime(Date.from(Instant.now().minusSeconds(600)))
                .expirationTime(Date.from(Instant.now().plusSeconds(grant.variant() == Variant.EXPIRED ? -300 : 300)))
                .claim("name", "Persona Fixture")
                .claim("email", "fixture@example.com")
                .claim("email_verified", true);
        if (grant.variant() != Variant.NONCE_MISSING) {
            claims.claim("nonce", grant.variant() == Variant.NONCE_WRONG ? "incorrect-nonce" : grant.nonce());
        }
        var jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims.build());
        jwt.sign(new RSASSASigner(grant.variant() == Variant.SIGNATURE_WRONG ? wrongKey : key));
        String access = UUID.randomUUID().toString();
        accessTokens.put(access, grant);
        json(
                exchange,
                200,
                Map.of(
                        "token_type",
                        "Bearer",
                        "expires_in",
                        300,
                        "access_token",
                        access,
                        "id_token",
                        jwt.serialize(),
                        "scope",
                        "openid profile email"));
    }

    private void userInfo(HttpExchange exchange) throws IOException {
        userInfoCalls.incrementAndGet();
        require("GET".equals(exchange.getRequestMethod()));
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        require(authorization != null && authorization.startsWith("Bearer "));
        Grant grant = accessTokens.get(authorization.substring(7));
        require(grant != null);
        if (grant.variant() == Variant.USERINFO_ERROR) {
            json(exchange, 500, Map.of("error", "fictitious-private-detail"));
        } else if (grant.variant() == Variant.USERINFO_SUB_MISSING) {
            json(exchange, 200, Map.of("name", "Persona Fixture", "email", "fixture@example.com"));
        } else {
            json(
                    exchange,
                    200,
                    Map.of(
                            "sub",
                            grant.variant() == Variant.USERINFO_SUB_WRONG ? "another-subject" : grant.subject(),
                            "name",
                            "Persona Fixture",
                            "email",
                            "fixture@example.com",
                            "email_verified",
                            true));
        }
    }

    private static void require(boolean condition) {
        if (!condition) throw new IllegalStateException("Invalid fictitious provider request");
    }

    private static void json(HttpExchange exchange, int status, Object value) throws IOException {
        byte[] body = JsonMapper.builder().build().writeValueAsBytes(value);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
    }

    @Override
    public void close() {
        server.stop(0);
        executor.close();
    }
}
