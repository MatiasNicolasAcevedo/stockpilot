package server.server.shared.error;

/** Error de un campo del body, tal como lo recibe la SPA dentro de {@code errors[]} del ProblemDetail. */
public record FieldErrorResponse(String field, String message) {}
