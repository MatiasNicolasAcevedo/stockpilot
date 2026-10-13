package server.server.identity;

import java.time.Clock;
import java.util.Objects;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Resolves a validated OIDC identity without linking accounts by profile attributes. */
@Service
public class IdentityService {

    private static final String IDENTITY_CONSTRAINT = "uq_app_user_issuer_subject";

    private final AppUserRepository repository;
    private final Clock clock;
    private final TransactionTemplate transaction;

    public IdentityService(AppUserRepository repository, Clock clock, PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.clock = clock;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Returns a committed local user; the caller must not expose the persistence entity over HTTP. */
    public AppUser resolve(IdentityProfile profile) {
        Objects.requireNonNull(profile, "OIDC identity is required");
        try {
            return transaction.execute(status -> createOrUpdate(profile));
        } catch (DataIntegrityViolationException conflict) {
            if (!isIdentityConflict(conflict)) {
                throw conflict;
            }
            // execute has already rolled back. Never reread in the failed PostgreSQL transaction.
            return transaction.execute(status -> {
                var winner = repository
                        .findByIssuerAndSubject(profile.issuer(), profile.subject())
                        .orElseThrow(() -> conflict);
                updateProfile(winner, profile);
                return repository.saveAndFlush(winner);
            });
        }
    }

    private AppUser createOrUpdate(IdentityProfile profile) {
        var user = repository
                .findByIssuerAndSubject(profile.issuer(), profile.subject())
                .map(existing -> {
                    updateProfile(existing, profile);
                    return existing;
                })
                .orElseGet(() -> new AppUser(
                        profile.issuer(),
                        profile.subject(),
                        profile.email(),
                        Boolean.TRUE.equals(profile.emailVerified()),
                        profile.displayName(),
                        clock.instant()));
        return repository.saveAndFlush(user);
    }

    private void updateProfile(AppUser user, IdentityProfile profile) {
        user.updateProfile(
                profile.email(), Boolean.TRUE.equals(profile.emailVerified()), profile.displayName(), clock.instant());
    }

    private boolean isIdentityConflict(DataIntegrityViolationException failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                    && IDENTITY_CONSTRAINT.equals(violation.getConstraintName())) {
                return true;
            }
        }
        return false;
    }
}
