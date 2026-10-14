package server.server.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * Persona autenticada por un proveedor OIDC. La identidad estable es {@code (issuer, subject)}; email y nombre son
 * atributos mutables que no otorgan acceso ni fusionan cuentas. Los roles se definen por comercio, no aquí.
 */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String issuer;

    @Column(nullable = false, updatable = false)
    private String subject;

    @Column(length = 320)
    private String email;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AppUser() {}

    public AppUser(
            String issuer, String subject, String email, boolean emailVerified, String displayName, Instant now) {
        this.issuer = issuer;
        this.subject = subject;
        this.email = email;
        this.emailVerified = emailVerified;
        this.displayName = displayName;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    void updateProfile(String email, boolean emailVerified, String displayName, Instant now) {
        this.email = email;
        this.emailVerified = emailVerified;
        this.displayName = displayName;
        this.updatedAt = now;
    }

    public String getIssuer() {
        return issuer;
    }

    public String getSubject() {
        return subject;
    }

    public String getEmail() {
        return email;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
