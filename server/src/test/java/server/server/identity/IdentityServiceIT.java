package server.server.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import server.server.TestcontainersConfiguration;

/** Real persistence and transaction boundaries; the spy only synchronizes the two initial absent reads. */
@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class IdentityServiceIT {

    private static final String ISSUER = "https://accounts.google.com";
    private static final Instant FIRST_LOGIN = Instant.parse("2026-10-13T12:00:00Z");
    private static final Instant NEXT_LOGIN = FIRST_LOGIN.plusSeconds(60);

    @Autowired
    private IdentityService service;

    @MockitoSpyBean
    private AppUserRepository repository;

    @MockitoBean
    private Clock clock;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        when(clock.instant()).thenReturn(FIRST_LOGIN);
    }

    @AfterEach
    void cleanOwnRows() {
        jdbc.update("DELETE FROM app_user WHERE subject LIKE 'identity-it-%'");
    }

    @Test
    void createsUuidV7AndPreservesItAcrossProfileChanges() {
        var first = service.resolve(profile("identity-it-returning", "before@example.com", true, "Antes"));
        when(clock.instant()).thenReturn(NEXT_LOGIN);

        var next = service.resolve(profile("identity-it-returning", "after@example.com", false, "Después"));
        var stored = repository.findById(first.getId()).orElseThrow();

        assertThat(first.getId().version()).isEqualTo(7);
        assertThat(next.getId()).isEqualTo(first.getId());
        assertThat(stored.getId()).isEqualTo(first.getId());
        assertThat(stored.getIssuer()).isEqualTo(ISSUER);
        assertThat(stored.getSubject()).isEqualTo("identity-it-returning");
        assertThat(stored.getCreatedAt()).isEqualTo(FIRST_LOGIN);
        assertThat(stored.getUpdatedAt()).isEqualTo(NEXT_LOGIN);
        assertThat(stored.getEmail()).isEqualTo("after@example.com");
        assertThat(stored.isEmailVerified()).isFalse();
        assertThat(stored.getDisplayName()).isEqualTo("Después");
        assertThat(countIdentity(ISSUER, "identity-it-returning")).isEqualTo(1);
    }

    @Test
    void sameEmailNeverLinksDistinctSubjectsOrIssuers() {
        var first = service.resolve(profile("identity-it-shared", "same@example.com", true, "Demo"));
        var otherSubject = service.resolve(profile("identity-it-other", "same@example.com", true, "Demo"));
        var otherIssuer = service.resolve(new IdentityProfile(
                "https://issuer.example.test", "identity-it-shared", "same@example.com", true, "Demo"));

        assertThat(first.getId()).isNotEqualTo(otherSubject.getId()).isNotEqualTo(otherIssuer.getId());
        assertThat(otherSubject.getId()).isNotEqualTo(otherIssuer.getId());
        assertThat(countIdentity(ISSUER, "identity-it-shared")).isEqualTo(1);
        assertThat(countIdentity(ISSUER, "identity-it-other")).isEqualTo(1);
        assertThat(countIdentity("https://issuer.example.test", "identity-it-shared"))
                .isEqualTo(1);
    }

    @Test
    void optionalAttributesMayBeAbsentAndPreviouslyStoredValuesAreCleared() {
        var first = service.resolve(profile("identity-it-optional", "demo@example.com", true, "Demo"));
        when(clock.instant()).thenReturn(NEXT_LOGIN);
        var cleared = service.resolve(profile("identity-it-optional", null, null, null));
        var stored = repository.findById(first.getId()).orElseThrow();
        var minimal = service.resolve(profile("identity-it-minimal", null, null, null));

        assertThat(cleared.getId()).isEqualTo(first.getId());
        assertThat(stored.getEmail()).isNull();
        assertThat(stored.getDisplayName()).isNull();
        assertThat(stored.isEmailVerified()).isFalse();
        assertThat(stored.getCreatedAt()).isEqualTo(FIRST_LOGIN);
        assertThat(stored.getUpdatedAt()).isEqualTo(NEXT_LOGIN);
        assertThat(repository.findById(minimal.getId())).hasValueSatisfying(user -> {
            assertThat(user.getEmail()).isNull();
            assertThat(user.getDisplayName()).isNull();
            assertThat(user.isEmailVerified()).isFalse();
        });
    }

    @Test
    void concurrentFirstLoginsRecoverInANewTransactionAndReturnOneCommittedUser() throws Exception {
        var subject = "identity-it-race";
        var barrier = new CyclicBarrier(2);
        var reads = new CopyOnWriteArrayList<Read>();
        var initialReads = new AtomicInteger();
        // Spring Data is a JDK proxy: preserve the spy's delegate rather than call an abstract real method.
        var realRepositoryAnswer =
                mockingDetails(repository).getMockCreationSettings().getDefaultAnswer();
        doAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    var found = (Optional<AppUser>) realRepositoryAnswer.answer(invocation);
                    reads.add(new Read(
                            jdbc.queryForObject("SELECT txid_current()", Long.class),
                            found.isPresent(),
                            Thread.currentThread().getName()));
                    if (found.isEmpty() && initialReads.incrementAndGet() <= 2) {
                        barrier.await(10, TimeUnit.SECONDS);
                    }
                    return found;
                })
                .when(repository)
                .findByIssuerAndSubject(ISSUER, subject);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> {
                Thread.currentThread().setName("first-login");
                return service.resolve(profile(subject, "first@example.com", false, "Primero"));
            });
            var second = executor.submit(() -> {
                Thread.currentThread().setName("second-login");
                return service.resolve(profile(subject, "second@example.com", true, "Segundo"));
            });
            var firstUser = first.get(20, TimeUnit.SECONDS);
            var secondUser = second.get(20, TimeUnit.SECONDS);

            assertThat(firstUser.getId()).isEqualTo(secondUser.getId());
            assertThat(firstUser.getId().version()).isEqualTo(7);
            assertThat(countIdentity(ISSUER, subject)).isEqualTo(1);
            // Two absent reads raced; the third read found the winner after a real unique violation/rollback.
            assertThat(reads).hasSize(3);
            assertThat(reads).extracting(Read::found).containsExactly(false, false, true);
            assertThat(reads).extracting(Read::transactionId).doesNotHaveDuplicates();
            var stored = repository.findById(firstUser.getId()).orElseThrow();
            assertThat(stored.getCreatedAt()).isEqualTo(FIRST_LOGIN);
            assertThat(stored.getUpdatedAt()).isEqualTo(FIRST_LOGIN);
            // The loser updates the committed winner with its own complete profile.
            if (reads.getLast().threadName().equals("first-login")) {
                assertThat(stored.getEmail()).isEqualTo("first@example.com");
                assertThat(stored.isEmailVerified()).isFalse();
                assertThat(stored.getDisplayName()).isEqualTo("Primero");
            } else {
                assertThat(stored.getEmail()).isEqualTo("second@example.com");
                assertThat(stored.isEmailVerified()).isTrue();
                assertThat(stored.getDisplayName()).isEqualTo("Segundo");
            }
        }
    }

    @Test
    void unrelatedDatabaseFailureRollsBackWithoutLeavingAPartialUserOrAbortingTheCaller() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            assertThatThrownBy(() -> service.resolve(profile("identity-it-invalid", "x".repeat(321), true, "Demo")))
                    .isInstanceOf(DataIntegrityViolationException.class);
            assertThat(jdbc.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
        });

        assertThat(countIdentity(ISSUER, "identity-it-invalid")).isZero();
        var next = service.resolve(profile("identity-it-valid", "demo@example.com", true, "Demo"));
        assertThat(repository.findById(next.getId())).isPresent();
    }

    private static IdentityProfile profile(String subject, String email, Boolean verified, String name) {
        return new IdentityProfile(ISSUER, subject, email, verified, name);
    }

    private int countIdentity(String issuer, String subject) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM app_user WHERE issuer = ? AND subject = ?", Integer.class, issuer, subject);
    }

    private record Read(Long transactionId, boolean found, String threadName) {}
}
