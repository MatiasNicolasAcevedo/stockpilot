package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.Socket;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import server.server.TestcontainersConfiguration;

/** Real direct loopback diagnostics ignore forwarding, while still checking the actual request origin. */
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=none"})
class PublicOriginDiagnosticIT {
    @LocalServerPort
    private int port;

    @Test
    void actualLoopbackOriginIgnoresAttackerForwardingAndKeepsHttpCookies() throws Exception {
        String response = send(
                "/oauth2/authorization/google",
                "127.0.0.1:5173",
                "Forwarded: host=attacker.example;proto=https\r\nX-Forwarded-Host: attacker.example\r\nX-Forwarded-Proto: https\r\nX-Forwarded-Port: 443\r\nX-Forwarded-Prefix: /evil\r\n");
        assertThat(response).startsWith("HTTP/1.1 302");
        assertThat(response)
                .contains(
                        "redirect_uri=http://127.0.0.1:5173/login/oauth2/code/google",
                        "JSESSIONID=",
                        "HttpOnly",
                        "SameSite=Lax")
                .doesNotContain("attacker.example", "Secure", "Domain=", ";jsessionid");
    }

    @Test
    void forwardedMetadataCannotRepairAnUnapprovedActualHost() throws Exception {
        String response = send(
                "/api/v1/auth/csrf",
                "attacker.example",
                "X-Forwarded-Host: 127.0.0.1:5173\r\nX-Forwarded-Proto: http\r\nX-Forwarded-Port: 5173\r\n");
        assertThat(response)
                .startsWith("HTTP/1.1 400")
                .contains("Cache-Control: no-store")
                .doesNotContain("Set-Cookie:", "Location:", "attacker.example");
    }

    private String send(String path, String host, String headers) throws Exception {
        // Raw HTTP is needed to test Host; JDK HttpClient restricts that header.
        try (var socket = new Socket("127.0.0.1", port)) {
            socket.setSoTimeout(5000);
            socket.getOutputStream()
                    .write(("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\n" + headers
                                    + "Connection: close\r\n\r\n")
                            .getBytes(StandardCharsets.US_ASCII));
            return new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
