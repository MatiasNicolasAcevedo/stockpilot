package server.server.shared.error;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import server.server.identity.IdentityService;
import server.server.security.SecurityConfig;

/** T1-04 (backend): errores de validación del body como ProblemDetail con {@code errors[{field, message}]}. */
@ActiveProfiles("test")
@WebMvcTest(ApiExceptionHandlerTest.ValidationProbeController.class)
@Import({
    SecurityConfig.class,
    ApiExceptionHandlerTest.ValidationProbeController.class,
    ApiExceptionHandlerTest.ProbeSecurity.class
})
class ApiExceptionHandlerTest {

    /** Isolated test-only route; production remains deny-by-default for commercial APIs. */
    @TestConfiguration(proxyBeanMethods = false)
    static class ProbeSecurity {
        @Bean
        @Order(0)
        SecurityFilterChain validationProbeChain(HttpSecurity http) throws Exception {
            return http.securityMatcher(PATH)
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .build();
        }
    }

    private static final String PATH = "/api/v1/test/validation-probe";

    @MockitoBean
    private IdentityService identityService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void invalidBodyReturns400ProblemDetailWithSortedFieldErrors() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(oidcLogin())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  \",\"quantity\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandler.VALIDATION_DETAIL))
                .andExpect(jsonPath("$.errors", hasSize(2)))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("Ingresá un nombre."))
                .andExpect(jsonPath("$.errors[1].field").value("quantity"))
                .andExpect(jsonPath("$.errors[1].message").value("La cantidad debe ser al menos 1."));
    }

    @Test
    void validBodyIsNotAffected() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(oidcLogin())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Producto de prueba\",\"quantity\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Producto de prueba"));
    }

    @Test
    void malformedBodyIsStillAProblemDetailWithoutFieldErrors() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(oidcLogin())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors").doesNotExist());
    }

    record ProbeRequest(
            @NotBlank(message = "Ingresá un nombre.") String name,

            @NotNull(message = "Ingresá una cantidad.") @Min(value = 1, message = "La cantidad debe ser al menos 1.") Integer quantity) {}

    /** Controller solo de prueba: ejercita la validación sin inventar una funcionalidad de negocio. */
    @RestController
    static class ValidationProbeController {

        @PostMapping(PATH)
        ProbeRequest accept(@Valid @RequestBody ProbeRequest request) {
            return request;
        }
    }
}
