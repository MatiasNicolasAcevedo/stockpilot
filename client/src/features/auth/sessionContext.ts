import { createContext, useContext } from 'react'
import type { AuthUser } from './api'

/**
 * `loading`: todavía no hay respuesta de me. `error`: me falló sin dato previo (no se sabe si hay sesión).
 * `visitor`: me respondió 401. `authenticated`: hay usuario, aunque una revalidación posterior haya fallado.
 */
export type SessionStatus = 'loading' | 'error' | 'visitor' | 'authenticated'

export interface AuthSession {
  status: SessionStatus
  user: AuthUser | null
  /** Error de la última consulta de me (403, red, 5xx); no implica que la sesión haya terminado. */
  sessionError: Error | null
  retrySession: () => void
  /** El token CSRF vigente ya se obtuvo: recién entonces se habilitan mutaciones. */
  csrfReady: boolean
  csrfError: Error | null
  retryCsrf: () => void
  /** Un 401 llegó con un usuario autenticado: la sesión terminó en el server. */
  sessionEnded: boolean
  logout: () => void
  logoutPending: boolean
  /** Fallo del cierre (red, 5xx, 403): la sesión no se da por cerrada. Un 401 no aparece aquí, es expiración. */
  logoutError: Error | null
}

export const AuthSessionContext = createContext<AuthSession | null>(null)

export function useSession(): AuthSession {
  const session = useContext(AuthSessionContext)
  if (!session) throw new Error('useSession requiere AuthSessionProvider')
  return session
}

/** Nombre visible: displayName, si falta el email y, sin ninguno, un texto genérico. */
export function sessionLabel(user: AuthUser): string {
  return user.displayName?.trim() || user.email?.trim() || 'Usuario sin nombre'
}
