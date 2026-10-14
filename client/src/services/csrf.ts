import type { CsrfTokenResolver } from './http'

/**
 * Transporte CSRF de la SPA (ADR 0002, S-001): el server guarda el token en la cookie `XSRF-TOKEN` (legible por JS) y
 * exige el mismo valor, sin máscara, en el header `X-XSRF-TOKEN` de cada mutación. La cookie no es una credencial.
 */
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'

/** Valor de la cookie `name` dentro de un header `Cookie`/`document.cookie`, o null si falta o está vacía. */
export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue
    const value = part.slice(separator + 1).trim()
    if (value === '') return null
    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Lee la cookie vigente en cada petición: login, logout y renovación la reemplazan, así que nunca se retiene un token
 * anterior. Sin cookie no hay header; el server responde 403 y el flujo de renovación (features/auth) obtiene uno.
 */
export function createCookieCsrfTokenResolver(
  readCookies: () => string = () => document.cookie,
): CsrfTokenResolver {
  return () => {
    const token = readCookie(readCookies(), CSRF_COOKIE_NAME)
    return token === null ? null : { headerName: CSRF_HEADER_NAME, token }
  }
}
