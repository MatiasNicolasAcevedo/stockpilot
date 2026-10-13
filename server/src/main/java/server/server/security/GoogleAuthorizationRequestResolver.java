package server.server.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/** The framework resolver can otherwise process registrations/methods before authorization rules run. */
final class GoogleAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {
    private final DefaultOAuth2AuthorizationRequestResolver delegate;
    private final RequestMatcher start =
            PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/oauth2/authorization/google");

    GoogleAuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return start.matches(request) ? delegate.resolve(request) : null;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
        return start.matches(request) && "google".equals(registrationId)
                ? delegate.resolve(request, registrationId)
                : null;
    }
}
