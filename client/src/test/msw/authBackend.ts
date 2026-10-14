import { http, HttpResponse } from 'msw'
import { AUTH_CSRF_PATH, AUTH_ME_PATH, LOGOUT_PATH, type AuthUser } from '../../features/auth/api'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../../services/csrf'
import { problemResponse } from '../factories'
import { server } from './server'

const NO_STORE = { 'Cache-Control': 'no-store' }

interface AuthBackendState {
  user: AuthUser | null
  csrfToken: string | null
}

/**
 * Backend de auth simulado con la conducta del server (security/AuthController, SecurityConfig): me 200/401
 * ProblemDetail, csrf 204 que materializa la cookie si falta, POST logout 204 solo con header igual al token vigente y
 * 403 ProblemDetail si falta o difiere. En el navegador el server escribe la cookie con Set-Cookie; aquí se escribe en
 * `document.cookie` explícitamente, sin depender del manejo de cookies de MSW, para que la SPA la lea igual que en
 * producción. Tokens y usuarios siempre ficticios.
 */
export function createAuthBackend(initial: Partial<AuthBackendState> = {}) {
  const state: AuthBackendState = { user: null, csrfToken: null, ...initial }
  const calls = { me: 0, csrf: 0, logout: 0 }
  let issued = 0

  function setCookie(token: string | null) {
    document.cookie =
      token === null
        ? `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`
        : `${CSRF_COOKIE_NAME}=${token}; Path=/`
  }
  if (state.csrfToken !== null) setCookie(state.csrfToken)

  const handlers = [
    http.get(AUTH_ME_PATH, () => {
      calls.me += 1
      if (state.user === null) {
        return problemResponse(401, {
          title: 'Unauthorized',
          detail: 'Se requiere iniciar sesión.',
        })
      }
      return HttpResponse.json(state.user, { headers: NO_STORE })
    }),
    http.get(AUTH_CSRF_PATH, () => {
      calls.csrf += 1
      if (state.csrfToken === null) {
        issued += 1
        state.csrfToken = `csrf-ficticio-${issued}`
        setCookie(state.csrfToken)
      }
      return new HttpResponse(null, { status: 204, headers: NO_STORE })
    }),
    http.post(LOGOUT_PATH, ({ request }) => {
      calls.logout += 1
      const header = request.headers.get(CSRF_HEADER_NAME)
      if (state.csrfToken === null || header !== state.csrfToken) {
        return problemResponse(403, {
          title: 'Forbidden',
          detail: 'No tenés permiso para realizar esta operación.',
        })
      }
      state.user = null
      state.csrfToken = null
      setCookie(null)
      return new HttpResponse(null, { status: 204, headers: NO_STORE })
    }),
  ]

  return {
    handlers,
    calls,
    state,
    /** Simula lo que hace el server al autenticar: nueva sesión y cookie CSRF anterior borrada. */
    login(user: AuthUser) {
      state.user = user
      state.csrfToken = null
      setCookie(null)
    },
    /** Simula una sesión vencida en el server. */
    expireSession() {
      state.user = null
    },
  }
}

/** Crea el backend de auth y registra sus handlers para el test actual (setup.ts los descarta al terminar). */
export function installAuthBackend(...args: Parameters<typeof createAuthBackend>) {
  const backend = createAuthBackend(...args)
  server.use(...backend.handlers)
  return backend
}
