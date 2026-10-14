import { focusManager } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http as mock } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProviders } from '../../app/AppProviders'
import { createQueryClient } from '../../app/queryClient'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { createAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { AUTH_ME_PATH, CsrfRenewalRequiredError } from './api'
import { useAuthSession, useLogout } from './useAuthSession'

/** QueryClient con la configuración real de la app (incluida su política de reintentos). */
function renderAuthHook<T>(hook: () => T) {
  const queryClient = createQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppProviders queryClient={queryClient}>{children}</AppProviders>
  }
  return renderHook(hook, { wrapper: Wrapper })
}

function useBackend(...args: Parameters<typeof createAuthBackend>) {
  const backend = createAuthBackend(...args)
  server.use(...backend.handlers)
  return backend
}

afterEach(() => {
  focusManager.setFocused(undefined)
})

describe('useAuthSession', () => {
  it('expone el usuario autenticado', async () => {
    useBackend({ user: buildAuthUser() })

    const { result } = renderAuthHook(useAuthSession)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(buildAuthUser())
  })

  it('un visitante resuelve a null con un único request: el 401 no es error ni se reintenta', async () => {
    const backend = useBackend()

    const { result } = renderAuthHook(useAuthSession)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(backend.calls.me).toBe(1)
  })

  it('un 403 queda como error, no como visitante, y no se reintenta', async () => {
    let requests = 0
    server.use(
      mock.get(AUTH_ME_PATH, () => {
        requests += 1
        return problemResponse(403)
      }),
    )

    const { result } = renderAuthHook(useAuthSession)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 403 })
    expect(requests).toBe(1)
  })

  it('revalida la sesión al recuperar el foco y refleja su vencimiento', async () => {
    const backend = useBackend({ user: buildAuthUser() })
    const { result } = renderAuthHook(useAuthSession)
    await waitFor(() => expect(result.current.data).toEqual(buildAuthUser()))

    backend.expireSession()
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(result.current.data).toBeNull())
    expect(backend.calls.me).toBe(2)
  })
})

describe('useLogout', () => {
  it('un 403 pide reintento explícito sin reenviar el POST', async () => {
    const backend = useBackend()
    backend.login(buildAuthUser())
    const { result } = renderAuthHook(useLogout)

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(CsrfRenewalRequiredError)
    expect(backend.calls).toMatchObject({ logout: 1, csrf: 1 })
    expect(backend.state.user).not.toBeNull()
  })

  it('con token vigente confirma el cierre', async () => {
    const backend = useBackend({ user: buildAuthUser(), csrfToken: 'csrf-ficticio-vigente' })
    const { result } = renderAuthHook(useLogout)

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(backend.state.user).toBeNull()
  })
})
