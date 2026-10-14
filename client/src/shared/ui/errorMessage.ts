import { CsrfRenewalRequiredError } from '../../features/auth/api'
import { ApiError, NetworkError, UnexpectedResponseError } from '../../services/http'

/** Mensaje comprensible para el usuario a partir de cualquier error de una petición. Nunca muestra detalles técnicos. */
export function errorMessage(error: unknown): string {
  if (error instanceof CsrfRenewalRequiredError) {
    // El token ya se renovó pero la operación no se reenvió: quien la pidió decide reintentar.
    return 'La operación fue rechazada y no se aplicó. Volvé a intentarla.'
  }
  if (error instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.'
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión no está activa. Iniciá sesión para continuar.'
    if (error.status === 403) return 'No tenés permiso para realizar esta acción.'
    if (error.status >= 500) {
      return 'El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.'
    }
    return error.problem?.detail ?? 'No se pudo completar la solicitud.'
  }
  if (error instanceof UnexpectedResponseError) {
    return 'El servidor respondió de forma inesperada. Intentá de nuevo más tarde.'
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.'
}
