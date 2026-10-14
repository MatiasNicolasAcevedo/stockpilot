package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.HttpCookie;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Cookie transport over real HTTP; never installs a principal or substitutes Spring authentication. */
final class OidcHttpBrowser {
    static final String PUBLIC_ORIGIN = "http://127.0.0.1:5173";
    static final String CALLBACK = PUBLIC_ORIGIN + "/login/oauth2/code/google";
    private final int port;
    private final Map<String, String> cookies = new LinkedHashMap<>();
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    OidcHttpBrowser(int port) {
        this.port = port;
    }

    String cookie(String name) {
        return cookies.get(name);
    }

    void cookie(String name, String value) {
        cookies.put(name, value);
    }

    HttpResponse<String> get(String path) throws Exception {
        return app(path, "GET", Map.of());
    }

    HttpResponse<String> post(String path, Map<String, String> headers) throws Exception {
        return app(path, "POST", headers);
    }

    URI start() throws Exception {
        var response = get("/oauth2/authorization/google?returnTo=https://attacker.example");
        assertThat(response.statusCode()).isEqualTo(302);
        assertNoStore(response);
        URI authorization = URI.create(response.headers().firstValue("Location").orElseThrow());
        var query = parameters(authorization.getRawQuery());
        assertThat(query.get("redirect_uri")).isEqualTo(CALLBACK);
        assertThat(query.get("client_id")).isEqualTo("stockpilot-test");
        assertThat(query.get("scope").split(" ")).contains("openid", "profile", "email");
        assertThat(query.containsKey("state") && !query.get("state").isBlank()).isTrue();
        assertThat(query.containsKey("nonce") && !query.get("nonce").isBlank()).isTrue();
        assertThat(cookie("JSESSIONID") != null).isTrue();
        return authorization;
    }

    URI authorize(URI authorization) throws Exception {
        var response = external(authorization);
        assertThat(response.statusCode()).isEqualTo(302);
        URI callback = URI.create(response.headers().firstValue("Location").orElseThrow());
        assertThat(callback.getScheme() + "://" + callback.getRawAuthority() + callback.getPath())
                .isEqualTo(CALLBACK);
        assertThat(parameters(callback.getRawQuery()).containsKey("code")).isTrue();
        return callback;
    }

    HttpResponse<String> callback(URI callback) throws Exception {
        return get(callback.getRawPath() + "?" + callback.getRawQuery());
    }

    HttpResponse<String> external(URI uri) throws Exception {
        return client.send(
                HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(5)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    JsonNode me() throws Exception {
        var response = get("/api/v1/auth/me");
        assertThat(response.statusCode()).isEqualTo(200);
        assertNoStore(response);
        var json = JsonMapper.builder().build().readTree(response.body());
        assertThat(json.propertyStream().map(Map.Entry::getKey).toList())
                .containsExactlyInAnyOrder("id", "displayName", "email", "emailVerified");
        return json;
    }

    void anonymous() throws Exception {
        var response = get("/api/v1/auth/me");
        assertThat(response.statusCode()).isEqualTo(401);
        assertNoStore(response);
        assertThat(response.headers().allValues("Location")).isEmpty();
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
    }

    static void success(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location").orElseThrow()).isEqualTo("/");
        assertNoStore(response);
    }

    static void failure(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location").orElseThrow()).isEqualTo("/login?error=authentication");
        assertThat(response.body()).isEmpty();
        assertNoStore(response);
    }

    static void assertNoStore(HttpResponse<?> response) {
        assertThat(java.util.Arrays.stream(response.headers()
                                .firstValue("Cache-Control")
                                .orElseThrow()
                                .split(","))
                        .map(String::trim)
                        .toList())
                .contains("no-store");
    }

    static void assertCookieDeleted(HttpResponse<?> response, String name) {
        assertThat(response.headers().allValues("Set-Cookie").stream()
                        .flatMap(value -> HttpCookie.parse(value).stream())
                        .anyMatch(cookie -> cookie.getName().equals(name)
                                && cookie.getValue().isEmpty()
                                && cookie.hasExpired()
                                && "/".equals(cookie.getPath())))
                .isTrue();
    }

    static Map<String, String> parameters(String raw) {
        var result = new LinkedHashMap<String, String>();
        if (raw != null) {
            for (String pair : raw.split("&")) {
                String[] parts = pair.split("=", 2);
                result.put(decode(parts[0]), parts.length == 2 ? decode(parts[1]) : "");
            }
        }
        return result;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private HttpResponse<String> app(String path, String method, Map<String, String> headers) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(5))
                .header("X-Forwarded-Host", "127.0.0.1:5173")
                .header("X-Forwarded-Proto", "http")
                .header("X-Forwarded-Port", "5173")
                .method(method, HttpRequest.BodyPublishers.noBody());
        if (!cookies.isEmpty()) {
            request.header(
                    "Cookie",
                    cookies.entrySet().stream()
                            .map(entry -> entry.getKey() + "=" + entry.getValue())
                            .collect(Collectors.joining("; ")));
        }
        headers.forEach(request::header);
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        for (String value : response.headers().allValues("Set-Cookie")) {
            for (HttpCookie cookie : HttpCookie.parse(value)) {
                if (cookie.getMaxAge() == 0 || cookie.getValue().isEmpty()) {
                    cookies.remove(cookie.getName());
                } else {
                    cookies.put(cookie.getName(), cookie.getValue());
                }
            }
        }
        return response;
    }
}
