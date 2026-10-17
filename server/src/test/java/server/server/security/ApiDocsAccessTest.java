package server.server.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** ADR 0003 opt-in validation: off by default, on only for an HTTP loopback origin, fixed failures without echo. */
class ApiDocsAccessTest {
    private static final String LOOPBACK_ONLY = "STOCKPILOT_API_DOCS_ENABLED requires an HTTP loopback APP_PUBLIC_URL";
    private static final String TRUE_OR_FALSE = "STOCKPILOT_API_DOCS_ENABLED must be true or false";

    @Test
    void isOffByDefaultAndWhenExplicitlyFalseEvenForHttpsOrigins() {
        for (String origin : new String[] {"https://stockpilot.example.test", "http://127.0.0.1:5173"}) {
            assertThat(ApiDocsAccess.from(null, PublicOrigin.parse(origin)).enabled())
                    .isFalse();
            assertThat(ApiDocsAccess.from("false", PublicOrigin.parse(origin)).enabled())
                    .isFalse();
            assertThat(ApiDocsAccess.from(" FALSE ", PublicOrigin.parse(origin)).enabled())
                    .isFalse();
        }
    }

    @Test
    void optInIsAcceptedForEveryHttpLoopbackOrigin() {
        for (String origin :
                new String[] {"http://localhost", "http://127.0.0.1:5173", "http://[::1]:5176", "http://LOCALHOST:5175"
                }) {
            assertThat(ApiDocsAccess.from("true", PublicOrigin.parse(origin)).enabled())
                    .isTrue();
        }
        assertThat(ApiDocsAccess.from(" True ", PublicOrigin.parse("http://localhost"))
                        .enabled())
                .isTrue();
    }

    @Test
    void optInIsRejectedForHttpsOrOtherHostsWithoutEchoingTheOrigin() {
        for (String origin : new String[] {
            "https://localhost", "https://127.0.0.1:8443", "https://[::1]", "https://stockpilot.example.test"
        }) {
            assertThatThrownBy(() -> ApiDocsAccess.from("true", PublicOrigin.parse(origin)))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage(LOOPBACK_ONLY)
                    .hasNoCause();
        }
        // HTTP on another host never becomes a PublicOrigin: rejected earlier with its own fixed message.
        assertThatThrownBy(() -> PublicOrigin.parse("http://docs.example.test"))
                .isInstanceOf(IllegalArgumentException.class)
                .message()
                .doesNotContain("docs.example.test");
    }

    @Test
    void ambiguousSwitchValuesAreRejectedWithoutEchoingThem() {
        for (String value : new String[] {"", " ", "yes", "on", "1", "enabled", "true,false"}) {
            assertThatThrownBy(() -> ApiDocsAccess.from(value, PublicOrigin.parse("http://localhost")))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage(TRUE_OR_FALSE)
                    .hasNoCause();
        }
    }
}
