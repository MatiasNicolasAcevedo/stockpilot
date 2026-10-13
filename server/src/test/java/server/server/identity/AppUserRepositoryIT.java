package server.server.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import server.server.TestcontainersConfiguration;

/** Persistencia de la identidad local contra PostgreSQL real con el esquema de Flyway. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class AppUserRepositoryIT {

    private static final Instant NOW = Instant.parse("2026-10-12T15:00:00Z");
    private static final String GOOGLE = "https://accounts.google.com";

    @Autowired
    private AppUserRepository repository;

    @Test
    void storesAndFindsUserByStableIdentity() {
        var saved = repository.saveAndFlush(
                new AppUser(GOOGLE, "sub-lucia", "lucia@ejemplo.com", true, "Lucía Ejemplo", NOW));

        var found = repository.findByIssuerAndSubject(GOOGLE, "sub-lucia");

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getId().version()).isEqualTo(7);
        assertThat(found).hasValueSatisfying(user -> {
            assertThat(user.getEmail()).isEqualTo("lucia@ejemplo.com");
            assertThat(user.isEmailVerified()).isTrue();
            assertThat(user.getCreatedAt()).isEqualTo(NOW);
        });
    }

    @Test
    void rejectsDuplicateIssuerAndSubject() {
        repository.saveAndFlush(new AppUser(GOOGLE, "sub-pedro", "pedro@ejemplo.com", true, "Pedro", NOW));

        assertThatThrownBy(() -> repository.saveAndFlush(
                        new AppUser(GOOGLE, "sub-pedro", "otro@ejemplo.com", true, "Pedro bis", NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sameSubjectFromAnotherIssuerIsADifferentIdentity() {
        repository.saveAndFlush(new AppUser(GOOGLE, "sub-compartido", "a@ejemplo.com", true, "A", NOW));
        repository.saveAndFlush(
                new AppUser("https://issuer.ejemplo.test", "sub-compartido", "a@ejemplo.com", true, "A", NOW));

        assertThat(repository.count()).isEqualTo(2);
    }
}
