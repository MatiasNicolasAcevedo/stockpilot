package server.server.identity;

/** Internal input supplied only after the OIDC provider response has been validated. */
public record IdentityProfile(String issuer, String subject, String email, Boolean emailVerified, String displayName) {

    public IdentityProfile {
        if (issuer == null || issuer.isBlank() || subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("OIDC identity requires a non-blank issuer and subject");
        }
    }
}
