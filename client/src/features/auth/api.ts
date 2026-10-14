import { z } from 'zod'
import { ApiError, http } from '../../services/http'

export const AUTH_ME_PATH = '/api/v1/auth/me'
export const AUTH_CSRF_PATH = '/api/v1/auth/csrf'
export const LOGOUT_PATH = '/logout'
/** Inicio OIDC: navegación completa del navegador (no fetch), para que el backend haga todo el intercambio. */
export const GOOGLE_LOGIN_PATH = '/oauth2/authorization/google'

/**
 * Contrato de `GET /api/v1/auth/me` (server: security/AuthMeResponse). `displayName` y `email` llegan siempre, pero
 * pueden ser null. Cualquier otro campo (issuer, subject, tokens, roles) se descarta: la SPA no lo conserva.
 */
export const authUserSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
})

export type AuthUser = z.infer<typeof authUserSchema>

/** Todo lo de este prefijo describe la sesión, no datos privados: sobrevive a la limpieza de cache al salir. */
export const authQueryKeys = {
  all: ['auth'] as const,
  session: ['auth', 'session'] as const,
  csrf: ['auth', 'csrf'] as const,
}

/**
 * Usuario de la sesión actual, o null para un visitante: el 401 de `me` es la respuesta esperada sin sesión. 403, red,
 * 5xx o un cuerpo fuera de contrato se rechazan; no equivalen a «sin sesión».
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    return await http.request(AUTH_ME_PATH, authUserSchema, { signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/** Pide al server que materialice la cookie CSRF si falta (204 sin cuerpo). No cambia identidad ni da acceso. */
export function renewCsrf(signal?: AbortSignal): Promise<void> {
  return http.requestVoid(AUTH_CSRF_PATH, { signal })
}

/**
 * La mutación fue rechazada con 403 y ya se obtuvo un token CSRF nuevo. No se reenvió: quien la inició decide si
 * reintentar. Un 403 también puede ser un permiso denegado, por eso no afirma que la sesión haya cambiado.
 */
export class CsrfRenewalRequiredError extends Error {
  readonly rejection: ApiError

  constructor(rejection: ApiError) {
    super('La operación fue rechazada y no se aplicó. Volvé a intentarla.', { cause: rejection })
    this.name = 'CsrfRenewalRequiredError'
    this.rejection = rejection
  }
}

/**
 * Ejecuta `mutation` una sola vez. Ante 403 obtiene un token nuevo y rechaza con `CsrfRenewalRequiredError` para pedir
 * un reintento explícito; si la renovación falla, conserva el 403 original. 401, red, 5xx y demás pasan sin cambios.
 */
export async function withCsrfRenewal<T>(
  mutation: () => Promise<T>,
  renew: () => Promise<void> = renewCsrf,
): Promise<T> {
  try {
    return await mutation()
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 403) throw error
    try {
      await renew()
    } catch {
      throw error
    }
    throw new CsrfRenewalRequiredError(error)
  }
}

/**
 * Cierra la sesión en el server (204; anónimo con CSRF válido también es 204). Solo un 204 confirma el cierre: 403,
 * red o 5xx no lo afirman. Limpiar cache, obtener CSRF anónimo y navegar corresponde a la UI de sesión.
 */
export function logout(): Promise<void> {
  return withCsrfRenewal(() => http.requestVoid(LOGOUT_PATH, { method: 'POST' }))
}
