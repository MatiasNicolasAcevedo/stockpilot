package server.server.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Base de seguridad de M0: todo requiere autenticación salvo el health de Actuator y el endpoint público de
 * referencia {@code GET /api/v1/system/info} (nombre y versión, sin datos sensibles). Los rechazos se delegan al
 * manejo de errores de MVC para responder ProblemDetail (401/403) en lugar de HTML o redirecciones. El login Google
 * OIDC, la sesión y la entrega del token CSRF a la SPA se agregan en T-002; CSRF ya está activo por defecto.
 */
@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http, @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver)
            throws Exception {
        http.authorizeHttpRequests(auth -> auth.requestMatchers("/actuator/health", "/actuator/health/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/system/info")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, failure) ->
                                exceptionResolver.resolveException(request, response, null, failure))
                        .accessDeniedHandler((request, response, failure) ->
                                exceptionResolver.resolveException(request, response, null, failure)));
        return http.build();
    }
}
