package server.server.security;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/** Slice requests use the configured public origin. Real forwarding is verified separately over HTTP. */
final class AuthOriginMockMvc {
    static MockMvc create(WebApplicationContext context, PublicOrigin origin) {
        return MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .defaultRequest(get("/").with(request -> {
                    request.setScheme(origin.uri().getScheme());
                    request.setServerName(origin.uri().getHost());
                    request.setServerPort(
                            origin.uri().getPort() == -1
                                    ? (origin.secure() ? 443 : 80)
                                    : origin.uri().getPort());
                    request.setSecure(origin.secure());
                    return request;
                }))
                .build();
    }
}
