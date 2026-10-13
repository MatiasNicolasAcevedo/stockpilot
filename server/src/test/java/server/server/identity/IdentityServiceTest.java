package server.server.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

class IdentityServiceTest {

    private static final String ISSUER = "https://accounts.google.com";
    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");
    private final AppUserRepository repository = mock(AppUserRepository.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private IdentityService service;

    @BeforeEach
    void setUp() {
        when(transactionManager.getTransaction(any())).thenAnswer(invocation -> {
            TransactionDefinition definition = invocation.getArgument(0);
            assertThat(definition.getPropagationBehavior()).isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            return new SimpleTransactionStatus();
        });
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service = new IdentityService(repository, Clock.fixed(NOW, ZoneOffset.UTC), transactionManager);
    }

    @Test
    void createsFromValidatedIdentityUsingInjectedClock() {
        var user = service.resolve(new IdentityProfile(ISSUER, "new-person", "demo@example.com", true, "Persona Demo"));

        assertThat(user.getIssuer()).isEqualTo(ISSUER);
        assertThat(user.getSubject()).isEqualTo("new-person");
        assertThat(user.getEmail()).isEqualTo("demo@example.com");
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getDisplayName()).isEqualTo("Persona Demo");
        assertThat(user.getCreatedAt()).isEqualTo(NOW);
        assertThat(user.getUpdatedAt()).isEqualTo(NOW);
        verify(transactionManager).commit(any());
    }

    @Test
    void updatesProfileWithoutChangingIdentityOrCreationTime() {
        var createdAt = NOW.minusSeconds(300);
        var existing = new AppUser(ISSUER, "returning-person", "old@example.com", true, "Antes", createdAt);
        when(repository.findByIssuerAndSubject(ISSUER, "returning-person")).thenReturn(Optional.of(existing));

        var user =
                service.resolve(new IdentityProfile(ISSUER, "returning-person", "new@example.com", false, "Después"));

        assertThat(user).isSameAs(existing);
        assertThat(user.getIssuer()).isEqualTo(ISSUER);
        assertThat(user.getSubject()).isEqualTo("returning-person");
        assertThat(user.getCreatedAt()).isEqualTo(createdAt);
        assertThat(user.getUpdatedAt()).isEqualTo(NOW);
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.isEmailVerified()).isFalse();
        assertThat(user.getDisplayName()).isEqualTo("Después");
    }

    @Test
    void acceptsAbsentOptionalAttributesAndTreatsMissingVerificationAsFalse() {
        var user = service.resolve(new IdentityProfile(ISSUER, "minimal-person", null, null, null));

        assertThat(user.getEmail()).isNull();
        assertThat(user.getDisplayName()).isNull();
        assertThat(user.isEmailVerified()).isFalse();
    }

    @Test
    void usesExactIdentityWithoutTrimmingOrCaseFolding() {
        service.resolve(new IdentityProfile(ISSUER, " Person ", null, null, null));

        verify(repository).findByIssuerAndSubject(ISSUER, " Person ");
        verify(repository, never()).findByIssuerAndSubject(ISSUER, "person");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void rejectsMissingIssuer(String issuer) {
        assertThatThrownBy(() -> new IdentityProfile(issuer, "person", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("OIDC identity requires a non-blank issuer and subject");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void rejectsMissingSubject(String subject) {
        assertThatThrownBy(() -> new IdentityProfile(ISSUER, subject, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rollsBackBeforeRecoveringTheConcurrentWinnerAndUpdatesItsProfile() {
        var winner = new AppUser(ISSUER, "race", "first@example.com", false, "Primero", NOW.minusSeconds(1));
        var conflict = constraintFailure("uq_app_user_issuer_subject");
        when(repository.findByIssuerAndSubject(ISSUER, "race"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));
        when(repository.saveAndFlush(any())).thenThrow(conflict).thenReturn(winner);

        var user = service.resolve(new IdentityProfile(ISSUER, "race", "second@example.com", true, "Segundo"));

        assertThat(user).isSameAs(winner);
        assertThat(user.getCreatedAt()).isEqualTo(NOW.minusSeconds(1));
        assertThat(user.getUpdatedAt()).isEqualTo(NOW);
        assertThat(user.getEmail()).isEqualTo("second@example.com");
        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getDisplayName()).isEqualTo("Segundo");
        var order = inOrder(transactionManager, repository);
        order.verify(transactionManager).getTransaction(any());
        order.verify(repository).findByIssuerAndSubject(ISSUER, "race");
        order.verify(repository).saveAndFlush(any());
        order.verify(transactionManager).rollback(any());
        order.verify(transactionManager).getTransaction(any());
        order.verify(repository).findByIssuerAndSubject(ISSUER, "race");
        order.verify(repository).saveAndFlush(winner);
        order.verify(transactionManager).commit(any());
    }

    @Test
    void propagatesOtherConstraintsWithoutRetry() {
        var failure = constraintFailure("pk_app_user");
        when(repository.saveAndFlush(any())).thenThrow(failure);

        assertThatThrownBy(() -> service.resolve(new IdentityProfile(ISSUER, "failure", null, null, null)))
                .isSameAs(failure);
        verify(repository).findByIssuerAndSubject(ISSUER, "failure");
        verify(transactionManager).rollback(any());
        verify(transactionManager, never()).commit(any());
    }

    @Test
    void propagatesUnclassifiedIntegrityFailureWithoutRetry() {
        var failure = new DataIntegrityViolationException("Synthetic persistence failure");
        when(repository.saveAndFlush(any())).thenThrow(failure);

        assertThatThrownBy(() -> service.resolve(new IdentityProfile(ISSUER, "failure", null, null, null)))
                .isSameAs(failure);
        verify(repository).findByIssuerAndSubject(ISSUER, "failure");
    }

    @Test
    void doesNotLoopIfConflictHasNoRecoverableWinner() {
        var conflict = constraintFailure("uq_app_user_issuer_subject");
        when(repository.saveAndFlush(any())).thenThrow(conflict);

        assertThatThrownBy(() -> service.resolve(new IdentityProfile(ISSUER, "missing-winner", null, null, null)))
                .isSameAs(conflict);
        verify(repository, org.mockito.Mockito.times(2)).findByIssuerAndSubject(ISSUER, "missing-winner");
        verify(transactionManager, org.mockito.Mockito.times(2)).rollback(any());
    }

    private static DataIntegrityViolationException constraintFailure(String name) {
        return new DataIntegrityViolationException(
                "Synthetic constraint conflict",
                new ConstraintViolationException("Conflict", new SQLException(), name));
    }
}
