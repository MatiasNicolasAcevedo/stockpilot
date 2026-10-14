package server.server.security;

import java.util.UUID;

/** Current local identity only. No provider identifiers, tokens, or commercial permissions. */
public record AuthMeResponse(UUID id, String displayName, String email, boolean emailVerified) {}
