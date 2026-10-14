import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError, UnexpectedResponseError } from '../../services/http'
import { sessionEvents } from '../../services/sessionEvents'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { createAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import {
  AUTH_CSRF_PATH,
  AUTH_ME_PATH,
  CsrfRenewalRequiredError,
  fetchCurrentUser,
  logout,
  renewCsrf,
  withCsrfRenewal,
} from './api'

function useBackend(...args: Parameters<typeof createAuthBackend>) {
  const backend = createAuthBackend(...args)
  server.use(...backend.handlers)
  return backend
}

describe('fetchCurrentUser', () => {
  it('devuelve el usuario validado, con atributos de perfil nullable', async () => {
    const user = buildAuthUser({ displayName: null, email: null, emailVerified: false })
    useBackend({ user })

    await expect(fetchCurrentUser()).resolves.toEqual(user)
  })

  it('descarta campos ajenos al contrato, como identificadores o tokens del proveedor', async () => {
    server.use(
      mock.get(AUTH_ME_PATH, () =>
        HttpResponse.json({
          ...buildAuthUser(),
          subject: 'sub-ficticio',
          idToken: 'token-ficticio',
          roles: ['OWNER'],
        }),
      ),
    )

    const current = await fetchCurrentUser()

    expect(current).toEqual(buildAuthUser())
    expect(Object.keys(current ?? {})).toEqual(['id', 'displayName', 'email', 'emailVerified'])
  })

  it('trata el 401 de un visitante como sesión ausente y lo publica en el canal de sesión', async () => {
    const backend = useBackend()
    const listener = vi.fn()
    const unsubscribe = sessionEvents.onUnauthorized(listener)

    try {
      await expect(fetchCurrentUser()).resolves.toBeNull()
    } finally {
      unsubscribe()
    }

    expect(backend.calls.me).toBe(1)
    expect(listener).toHaveBeenCalledWith({ path: AUTH_ME_PATH, method: 'GET' })
  })

  it.each([
    ['403', () => problemResponse(403), ApiError],
    ['500', () => problemResponse(500), ApiError],
    ['red', () => HttpResponse.error(), NetworkError],
  ])('%s no equivale a «sin sesión»', async (_, respond, errorType) => {
    server.use(mock.get(AUTH_ME_PATH, respond))

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(errorType)
  })

  it.each([
    ['id que no es UUID', { ...buildAuthUser(), id: '42' }],
    ['displayName ausente', { id: buildAuthUser().id, email: null, emailVerified: true }],
    ['email ausente', { id: buildAuthUser().id, displayName: null, emailVerified: true }],
    ['emailVerified null', { ...buildAuthUser(), emailVerified: null }],
  ])('rechaza un cuerpo fuera de contrato: %s', async (_, body) => {
    server.use(mock.get(AUTH_ME_PATH, () => HttpResponse.json(body)))

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(UnexpectedResponseError)
  })
})

describe('renewCsrf', () => {
  it('obtiene el token por GET sin enviar header CSRF y deja la cookie lista para mutar', async () => {
    let header: string | null = 'sin-request'
    const backend = useBackend()
    server.use(
      mock.get(AUTH_CSRF_PATH, ({ request }) => {
        header = request.headers.get('X-XSRF-TOKEN')
        return undefined // sigue al handler del backend simulado
      }),
    )

    await renewCsrf()

    expect(header).toBeNull()
    expect(backend.calls.csrf).toBe(1)
    expect(document.cookie).toContain('XSRF-TOKEN=csrf-ficticio-1')
  })
})

describe('logout con renovación de CSRF', () => {
  it('sin cookie tras el login: no afirma el cierre, renueva el token y no reenvía hasta el reintento explícito', async () => {
    const backend = useBackend()
    backend.login(buildAuthUser())

    const first = await logout().catch((e: unknown) => e)

    expect(first).toBeInstanceOf(CsrfRenewalRequiredError)
    expect(first).toMatchObject({ rejection: { status: 403 } })
    expect(backend.calls).toMatchObject({ logout: 1, csrf: 1 })
    await expect(fetchCurrentUser()).resolves.toEqual(buildAuthUser())

    await expect(logout()).resolves.toBeUndefined()

    expect(backend.calls.logout).toBe(2)
    expect(document.cookie).not.toContain('XSRF-TOKEN')
    await expect(fetchCurrentUser()).resolves.toBeNull()
  })

  it('con el token vigente cierra la sesión en un solo POST', async () => {
    const backend = useBackend({ user: buildAuthUser(), csrfToken: 'csrf-ficticio-vigente' })

    await logout()

    expect(backend.calls).toMatchObject({ logout: 1, csrf: 0 })
    expect(backend.state.user).toBeNull()
  })
})

describe('withCsrfRenewal', () => {
  it('si la renovación falla conserva el 403 original', async () => {
    const rejection = new ApiError(403, null)
    const mutation = vi.fn(() => Promise.reject(rejection))
    const renew = vi.fn(() => Promise.reject(new NetworkError(new TypeError('failed'))))

    await expect(withCsrfRenewal(mutation, renew)).rejects.toBe(rejection)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(renew).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['401', new ApiError(401, null)],
    ['500', new ApiError(500, null)],
    ['red', new NetworkError(new TypeError('failed'))],
  ])('%s se propaga sin renovar ni reenviar', async (_, failure) => {
    const mutation = vi.fn(() => Promise.reject(failure))
    const renew = vi.fn(() => Promise.resolve())

    await expect(withCsrfRenewal(mutation, renew)).rejects.toBe(failure)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(renew).not.toHaveBeenCalled()
  })

  it('devuelve el resultado de una mutación exitosa sin renovar', async () => {
    const renew = vi.fn(() => Promise.resolve())

    await expect(withCsrfRenewal(() => Promise.resolve('guardado'), renew)).resolves.toBe(
      'guardado',
    )
    expect(renew).not.toHaveBeenCalled()
  })
})
