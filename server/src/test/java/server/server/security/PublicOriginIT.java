package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import server.server.TestcontainersConfiguration;

/** Real Tomcat + framework forwarding, simulating a trusted HTTPS proxy, without a token exchange. */
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=https://demo.example:8443", "server.forward-headers-strategy=framework"})
class PublicOriginIT {
    @LocalServerPort
    private int port;

    private final HttpClient client =
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

    @Test
    void reconstructedHttpsOriginUsesExactCallbackAndSecureCookies() throws Exception {
        var login = send(trusted("/oauth2/authorization/google"));
        assertThat(login.statusCode()).isEqualTo(302);
        assertThat(URLDecoder.decode(login.headers().firstValue("Location").orElseThrow(), StandardCharsets.UTF_8))
                .contains("redirect_uri=https://demo.example:8443/login/oauth2/code/google")
                .doesNotContain("127.0.0.1", ";jsessionid");
        assertThat(login.headers().allValues("Set-Cookie"))
                .anySatisfy(cookie ->
                        assertThat(cookie).startsWith("JSESSIONID=").contains("Secure", "HttpOnly", "SameSite=Lax"));
        var csrf = send(trusted("/api/v1/auth/csrf"));
        assertThat(csrf.statusCode()).isEqualTo(204);
        assertThat(csrf.headers().allValues("Set-Cookie"))
                .anySatisfy(cookie -> assertThat(cookie)
                        .startsWith("XSRF-TOKEN=")
                        .contains("Secure", "SameSite=Lax")
                        .doesNotContain("HttpOnly", "Domain="));
        assertThat(send(trusted("/api/v1/auth/me")).statusCode()).isEqualTo(401);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "/oauth2/authorization/google",
                "/login/oauth2/code/google",
                "/api/v1/auth/me",
                "/api/v1/auth/csrf",
                "/logout"
            })
    void directInternalOriginIsRejectedBeforeSessionCsrfOrOidc(String path) throws Exception {
        rejected(send(request(path)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"host", "proto", "port", "prefix", "forwarded", "host-chain"})
    void mismatchedReconstructedRequestIsRejectedSafely(String spoof) throws Exception {
        var request = trusted("/oauth2/authorization/google");
        switch (spoof) {
            case "host" -> request.setHeader("X-Forwarded-Host", "attacker.example");
            case "proto" -> request.setHeader("X-Forwarded-Proto", "http");
            case "port" -> request.setHeader("X-Forwarded-Port", "443");
            case "prefix" -> request.setHeader("X-Forwarded-Prefix", "/evil");
            case "forwarded" -> request.setHeader("Forwarded", "for=192.0.2.99;host=attacker.example;proto=http");
            case "host-chain" -> request.setHeader("X-Forwarded-Host", "attacker.example,demo.example:8443");
            default -> throw new AssertionError(spoof);
        }
        rejected(send(request));
    }

    @Test
    void standardForwardedHeaderAlsoReconstructsTheConfiguredOrigin() throws Exception {
        var result = send(request("/api/v1/auth/csrf")
                .header("Forwarded", "for=192.0.2.1;host=\"demo.example:8443\";proto=https"));
        assertThat(result.statusCode()).isEqualTo(204);
    }

    @Test
    void healthCheckRemainsInternal() throws Exception {
        assertThat(send(request("/actuator/health/readiness")).statusCode()).isEqualTo(200);
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .GET();
    }

    private HttpRequest.Builder trusted(String path) {
        return request(path)
                .header("X-Forwarded-Host", "demo.example:8443")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Port", "8443")
                .header("X-Forwarded-For", "192.0.2.1");
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void rejected(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).isEqualTo("no-store");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
        assertThat(response.headers().allValues("Location")).isEmpty();
        assertThat(response.body())
                .contains("\"status\":400")
                .doesNotContain("attacker", "demo.example", "192.0.2", "stackTrace");
    }
}
