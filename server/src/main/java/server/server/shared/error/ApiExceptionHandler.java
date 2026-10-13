package server.server.shared.error;

import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Manejo transversal de errores de MVC como ProblemDetail ({@code application/problem+json}). Reemplaza al manejador
 * por defecto de Boot ({@code spring.mvc.problemdetails.enabled}) y agrega a los errores de validación del body la
 * lista {@code errors[{field, message}]} que la SPA vuelca junto a cada campo. Sin lógica de negocio.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    static final String VALIDATION_DETAIL = "La solicitud tiene datos inválidos.";

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail body = exception.getBody();
        body.setDetail(VALIDATION_DETAIL);
        body.setProperty("errors", fieldErrors(exception));
        return handleExceptionInternal(exception, body, headers, status, request);
    }

    /** Orden estable (campo, mensaje): Bean Validation no garantiza el orden de las violaciones. */
    private static List<FieldErrorResponse> fieldErrors(MethodArgumentNotValidException exception) {
        return exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldErrorResponse(error.getField(), error.getDefaultMessage()))
                .sorted(Comparator.comparing(FieldErrorResponse::field)
                        .thenComparing(FieldErrorResponse::message, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }
}
