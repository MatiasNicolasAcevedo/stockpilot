package server.server.system;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import server.server.identity.IdentityService;
import server.server.security.AuthController;
import server.server.security.SecurityConfig;

/** T1-03: el endpoint de referencia es público solo para GET; el resto de {@code /api/**} sigue exigiendo sesión. */
@ActiveProfiles("test")
@WebMvcTest({SystemInfoController.class, AuthController.class})
@Import(SecurityConfig.class)
class SystemInfoControllerTest {

    @MockitoBean
    private IdentityService identityService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousGetReturnsNameAndBuildVersion() throws Exception {
        mockMvc.perform(get("/api/v1/system/info").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.name").value("StockPilot"))
                // Versión filtrada desde el POM; nunca el placeholder sin resolver.
                .andExpect(jsonPath("$.version").value(matchesPattern("\\d+\\.\\d+\\.\\d+.*")));
    }

    @Test
    void otherMethodsOnTheSamePathStillRequireASession() throws Exception {
        var token = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        mockMvc.perform(post("/api/v1/system/info").cookie(token).header("X-XSRF-TOKEN", token.getValue()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void neighbouringApiPathsStillRequireASession() throws Exception {
        for (String path : new String[] {"/api/v1/system/info/extra", "/api/v1/system", "/api/v1/stores"}) {
            mockMvc.perform(get(path).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(401));
        }
    }
}
