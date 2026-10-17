package server.server.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseCookie;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.servlet.HandlerExceptionResolver;

/** Session authentication grants access only to the current identity, not future commercial resources. */
@Configuration(proxyBeanMethods = false)
@Import({OidcConfiguration.class, LocalOidcUserService.class, ApiDocsConfiguration.class})
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            PublicOrigin origin,
            ApiDocsAccess apiDocs,
            LocalOidcUserService oidcUsers,
            ClientRegistrationRepository registrations,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver)
            throws Exception {
        var csrfCookies = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfCookies.setCookiePath("/");
        csrfCookies.setCookieCustomizer(cookie -> cookie.sameSite("Lax").secure(origin.secure()));
        http.addFilterBefore(new PublicOriginFilter(origin), CsrfFilter.class)
                .authorizeHttpRequests(auth -> {
                    if (apiDocs.enabled()) {
                        // ADR 0003 opt-in: anonymous GET of the exact documentation routes; nothing else changes.
                        auth.requestMatchers(HttpMethod.GET, ApiDocsAccess.PATHS)
                                .permitAll();
                    }
                    auth.requestMatchers("/actuator/health", "/actuator/health/**")
                            .permitAll()
                            .requestMatchers(
                                    HttpMethod.GET,
                                    "/api/v1/system/info",
                                    "/api/v1/auth/csrf",
                                    "/oauth2/authorization/google",
                                    "/login/oauth2/code/google")
                            .permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/v1/auth/me", "/logout")
                            .authenticated()
                            .anyRequest()
                            .denyAll();
                })
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .csrf(csrf -> csrf.spa()
                        .csrfTokenRepository(csrfCookies)
                        .csrfTokenRequestHandler(new HeaderOnlySpaCsrfTokenRequestHandler()))
                .sessionManagement(session -> session.sessionFixation(fixation -> fixation.changeSessionId()))
                .oauth2Login(oauth -> oauth.loginPage("/oauth2/authorization/google")
                        .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(
                                new GoogleAuthorizationRequestResolver(registrations)))
                        .redirectionEndpoint(endpoint -> endpoint.baseUri("/login/oauth2/code/google"))
                        .withObjectPostProcessor(new ObjectPostProcessor<OAuth2LoginAuthenticationFilter>() {
                            @Override
                            public <O extends OAuth2LoginAuthenticationFilter> O postProcess(O filter) {
                                filter.setRequiresAuthenticationRequestMatcher(PathPatternRequestMatcher.pathPattern(
                                        HttpMethod.GET, "/login/oauth2/code/google"));
                                return filter;
                            }
                        })
                        .userInfoEndpoint(userInfo -> userInfo.oidcUserService(oidcUsers))
                        .successHandler((request, response, authentication) -> {
                            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
                            response.setStatus(302);
                            response.setHeader(HttpHeaders.LOCATION, "/");
                        })
                        .failureHandler((request, response, failure) -> {
                            // A failed/replayed callback must not retain an earlier authenticated session.
                            var session = request.getSession(false);
                            if (session != null) {
                                session.invalidate();
                            }
                            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
                            response.setStatus(302);
                            response.setHeader(HttpHeaders.LOCATION, "/login?error=authentication");
                        }))
                .logout(logout -> logout.logoutUrl("/logout")
                        .addLogoutHandler((request, response, authentication) -> response.addHeader(
                                HttpHeaders.SET_COOKIE,
                                ResponseCookie.from("JSESSIONID", "")
                                        .path("/")
                                        .httpOnly(true)
                                        .sameSite("Lax")
                                        .secure(origin.secure())
                                        .maxAge(0)
                                        .build()
                                        .toString()))
                        .logoutSuccessHandler((request, response, authentication) -> {
                            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
                            response.setStatus(204);
                        }))
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, failure) ->
                                exceptionResolver.resolveException(request, response, null, failure))
                        .accessDeniedHandler((request, response, failure) ->
                                exceptionResolver.resolveException(request, response, null, failure)));
        return http.build();
    }
}
