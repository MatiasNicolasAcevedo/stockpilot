-- Identidad local de una persona autenticada (PROJECT_CONTEXT §3 y §6 · Usuario).
-- La identidad estable es (issuer, subject) del proveedor OIDC; el email es un atributo mutable
-- y nunca se usa para fusionar cuentas. La pertenencia a comercios se modela en migraciones posteriores.
CREATE TABLE app_user (
    id             UUID         NOT NULL,
    issuer         VARCHAR(255) NOT NULL,
    subject        VARCHAR(255) NOT NULL,
    email          VARCHAR(320),
    email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
    display_name   VARCHAR(255),
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL,
    CONSTRAINT pk_app_user PRIMARY KEY (id),
    CONSTRAINT uq_app_user_issuer_subject UNIQUE (issuer, subject)
);
