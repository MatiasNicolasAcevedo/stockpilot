package server.server.security;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata for the session/CSRF contract (S-001). Documentation only: the document is published solely by the
 * local opt-in of ADR 0003 (GET under /api/docs/); otherwise SecurityConfig keeps every documentation route denied.
 */
@Configuration(proxyBeanMethods = false)
class AuthOpenApi {
    static final String SESSION_COOKIE = "sessionCookie";
    static final String CSRF_HEADER = "csrfHeader";
    static final String TAG = "Autenticación";

    @Bean
    OpenApiCustomizer authOpenApiCustomizer() {
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            openApi.getComponents()
                    .addSecuritySchemes(
                            SESSION_COOKIE,
                            new SecurityScheme()
                                    .type(SecurityScheme.Type.APIKEY)
                                    .in(SecurityScheme.In.COOKIE)
                                    .name("JSESSIONID")
                                    .description("Sesión del backend creada por el login OIDC: HttpOnly, SameSite=Lax,"
                                            + " Secure según el origen público. El navegador la envía; JavaScript no"
                                            + " la lee."))
                    .addSecuritySchemes(
                            CSRF_HEADER,
                            new SecurityScheme()
                                    .type(SecurityScheme.Type.APIKEY)
                                    .in(SecurityScheme.In.HEADER)
                                    .name("X-XSRF-TOKEN")
                                    .description("Valor crudo de la cookie XSRF-TOKEN (GET /api/v1/auth/csrf la"
                                            + " materializa). Obligatorio en toda mutación same-origin; nunca en query"
                                            + " string."));
            var logout = new Operation()
                    .addTagsItem(TAG)
                    .operationId("logout")
                    .summary("Cierra la sesión de StockPilot")
                    .description("Invalida la sesión y borra las cookies de sesión y CSRF. Sin sesión pero con CSRF"
                            + " válido también responde 204. No cierra la sesión de Google.")
                    .addSecurityItem(new SecurityRequirement().addList(CSRF_HEADER))
                    .addSecurityItem(
                            new SecurityRequirement().addList(SESSION_COOKIE).addList(CSRF_HEADER))
                    .responses(
                            new ApiResponses()
                                    .addApiResponse(
                                            "204", new ApiResponse().description("Sesión cerrada (o ya anónima)"))
                                    .addApiResponse(
                                            "403",
                                            new ApiResponse()
                                                    .description(
                                                            "Token CSRF ausente o inválido; la sesión no se cierra")
                                                    .content(
                                                            new Content()
                                                                    .addMediaType(
                                                                            "application/problem+json",
                                                                            new MediaType()
                                                                                    .schema(
                                                                                            new Schema<>()
                                                                                                    .$ref(
                                                                                                            "#/components/schemas/ProblemDetail"))))));
            var path = openApi.getPaths().computeIfAbsent("/logout", ignored -> new PathItem());
            path.setPost(logout);
        };
    }
}
