package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.SessionTrackingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.context.WebApplicationContext;
import server.server.TestcontainersConfiguration;

/** Real servlet cookie/session settings; authorize redirect only, no token/callback protocol claim. */
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_PUBLIC_URL=https://demo.example:8443")
class SessionCookieIT {
    @LocalServerPort
    private int port;

    @Autowired
    private WebApplicationContext application;

    @Test
    void sessionCookieIsHostOnlySecureHttpOnlyLaxNonPersistentAndCookieOnly() throws Exception {
        var response = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .build()
                .send(
                        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/oauth2/authorization/google"))
                                .GET()
                                .header("X-Forwarded-Host", "demo.example:8443")
                                .header("X-Forwarded-Proto", "https")
                                .header("X-Forwarded-Port", "8443")
                                .build(),
                        HttpResponse.BodyHandlers.discarding());
        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location").orElseThrow()).doesNotContain(";jsessionid");
        String session = response.headers().allValues("Set-Cookie").stream()
                .filter(cookie -> cookie.startsWith("JSESSIONID="))
                .findFirst()
                .orElseThrow();
        assertThat(session)
                .contains("Path=/", "Secure", "HttpOnly", "SameSite=Lax")
                .doesNotContain("Domain=", "Max-Age=", "Expires=");
        assertThat(application.getServletContext().getSessionTimeout()).isEqualTo(30);
        assertThat(application.getServletContext().getEffectiveSessionTrackingModes())
                .containsExactly(SessionTrackingMode.COOKIE);
    }
}
