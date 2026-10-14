import { focusManager, useQuery } from '@tanstack/react-query'
import { act, screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AppShell } from '../../app/AppShell'
import { http } from '../../services/http'
import { ErrorAlert } from '../../shared/ui/ErrorAlert'
import { buildAuthUser, problemResponse } from '../../test/factories'
import { installAuthBackend } from '../../test/msw/authBackend'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { AUTH_CSRF_PATH, AUTH_ME_PATH, LOGOUT_PATH, authQueryKeys } from './api'
import { AuthSessionProvider } from './AuthSessionProvider'
import { LoginPage } from './LoginPage'

// Datos privados de prueba: el server los entrega solo con sesión y siempre del usuario de esa sesión.
const PRIVATE_PATH = '/api/v1/test/private'
const PRIVATE_KEY = ['private', 'probe'] as const
const privateSchema = z.object({ owner: z.string() })

const personaA = buildAuthUser({
  id: '01900000-0000-7000-8000-00000000000a',
  displayName: 'Persona A',
  email: 'persona.a@example.com',
})
const personaB = buildAuthUser({
  id: '01900000-0000-7000-8000-00000000000b',
  displayName: 'Persona B',
  email: 'persona.b@example.com',
})

/** Pantalla privada mínima: sin vencimiento propio, así solo la limpieza de sesión puede quitar sus datos. */
function PrivateProbe() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: PRIVATE_KEY,
    queryFn: ({ signal }) => http.request(PRIVATE_PATH, privateSchema, { signal }),
    staleTime: Infinity,
  })
  return (
    <>
      {isPending ? <p role="status">Cargando datos privados…</p> : null}
      {error ? <ErrorAlert error={error} /> : null}
      {data ? <p>Datos de {data.owner}</p> : null}
      <button type="button" onClick={() => void refetch()}>
        Recargar datos
      </button>
    </>
  )
}

function renderSession(route = '/') {
  return renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<PrivateProbe />} />
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Routes>
    </AuthSessionProvider>,
    { route },
  )
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** API privada: decide con la sesión vigente al recibir la petición; `hold` retiene la próxima respuesta. */
function installPrivateApi(backend: ReturnType<typeof installAuthBackend>) {
  const gates: Promise<void>[] = []
  const calls = { count: 0 }
  server.use(
    mock.get(PRIVATE_PATH, async () => {
      calls.count += 1
      const user = backend.state.user
      const gate = gates.shift()
      if (gate) await gate
      if (user === null) return problemResponse(401, { detail: 'Se requiere iniciar sesión.' })
      return HttpResponse.json({ owner: user.displayName })
    }),
  )
  return {
    calls,
    hold() {
      const gate = deferred()
      gates.push(gate.promise)
      return gate.resolve
    },
  }
}

/** Retiene la próxima petición que coincida y luego la deja seguir hacia el backend simulado. */
function holdNext(method: 'get' | 'post', path: string) {
  const gate = deferred()
  server.use(
    mock[method](
      path,
      async () => {
        await gate.promise
      },
      { once: true },
    ),
  )
  return gate.resolve
}

function regainFocus() {
  act(() => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
}

/** El alert de MUI no toma su título como nombre accesible: se busca por el texto que anuncia. */
async function findAlert(title: RegExp) {
  await screen.findByText(title)
  const alert = screen.getAllByRole('alert').find((element) => title.test(element.textContent))
  if (!alert) throw new Error(`Sin alert con ${title}`)
  return alert
}

const banner = () => screen.getByRole('banner')

afterEach(() => {
  focusManager.setFocused(undefined)
})

describe('Sesión en el shell', () => {
  it('muestra el estado de carga y después al usuario con «Cerrar sesión», sin roles ni selector', async () => {
    installPrivateApi(installAuthBackend({ user: personaA }))
    const releaseMe = holdNext('get', AUTH_ME_PATH)

    renderSession()

    expect(screen.getByRole('status')).toHaveTextContent('Verificando sesión…')
    releaseMe()
    expect(await within(banner()).findByText('Persona A')).toBeVisible()
    expect(within(banner()).getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/rol|comercio/i)).not.toBeInTheDocument()
  })

  it.each([
    ['sin nombre usa el email', { displayName: null }, 'persona.a@example.com'],
    ['nombre en blanco usa el email', { displayName: '  ' }, 'persona.a@example.com'],
    [
      'sin nombre ni email usa un texto genérico',
      { displayName: null, email: null },
      'Usuario sin nombre',
    ],
  ])('%s', async (_case, overrides, expected) => {
    const backend = installAuthBackend({ user: { ...personaA, ...overrides } })
    installPrivateApi(backend)

    renderSession()

    expect(await within(banner()).findByText(expected)).toBeVisible()
  })

  it('un visitante ve «Ingresar», obtiene CSRF al montar y un 401 de API no termina nada', async () => {
    const backend = installAuthBackend()
    installPrivateApi(backend)

    renderSession()

    expect(await within(banner()).findByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(await screen.findByText(/Tu sesión no está activa/)).toBeVisible()
    await waitFor(() => expect(backend.calls.csrf).toBe(1))
    expect(document.cookie).toContain('XSRF-TOKEN=csrf-ficticio-1')
    expect(backend.calls.me).toBe(1)
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).not.toBeInTheDocument()
  })

  it('«Cerrar sesión» se habilita recién con el token CSRF obtenido', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    const releaseCsrf = holdNext('get', AUTH_CSRF_PATH)

    renderSession()

    const button = await within(banner()).findByRole('button', { name: 'Cerrar sesión' })
    expect(button).toBeDisabled()
    releaseCsrf()
    await waitFor(() => expect(button).toBeEnabled())
  })

  it('si falla el CSRF lo explica, mantiene deshabilitado el cierre y permite reintentar', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    server.use(mock.get(AUTH_CSRF_PATH, () => HttpResponse.error(), { once: true }))

    const { user } = renderSession()

    const alert = await findAlert(/No se pudo preparar la protección de la sesión/)
    expect(within(banner()).getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled()
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    await waitFor(() =>
      expect(within(banner()).getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un 403 de me se explica con reintento y no se toma como visitante', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    server.use(mock.get(AUTH_ME_PATH, () => problemResponse(403), { once: true }))

    const { user } = renderSession()

    const alert = await findAlert(/No se pudo verificar tu sesión/)
    expect(alert).toHaveTextContent('No tenés permiso')
    expect(within(banner()).queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await within(banner()).findByText('Persona A')).toBeVisible()
  })
})

describe('Expiración de la sesión', () => {
  it('un 401 con usuario cancela, limpia la cache y avisa, sin reintentar ni redirigir', async () => {
    const backend = installAuthBackend({ user: personaA })
    const privateApi = installPrivateApi(backend)
    const { user, queryClient } = renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()

    const releaseInFlight = privateApi.hold()
    await user.click(screen.getByRole('button', { name: 'Recargar datos' }))
    backend.expireSession()
    regainFocus()

    expect(await screen.findByText('La sesión terminó. Volvé a ingresar.')).toBeVisible()
    releaseInFlight()
    expect(within(banner()).queryByText('Persona A')).not.toBeInTheDocument()
    expect(within(banner()).getByRole('link', { name: 'Ingresar' })).toBeVisible()
    expect(screen.queryByText('Datos de Persona A')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ingresar a StockPilot' })).not.toBeInTheDocument()
    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined()
    expect(queryClient.getQueryData(authQueryKeys.session)).toBeNull()
    expect(backend.calls.me).toBe(2)
  })

  it('cualquier API privada con 401 termina la sesión de un usuario', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    const { user } = renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()

    backend.expireSession()
    await user.click(screen.getByRole('button', { name: 'Recargar datos' }))

    expect(await screen.findByText('La sesión terminó. Volvé a ingresar.')).toBeVisible()
    expect(screen.queryByText('Datos de Persona A')).not.toBeInTheDocument()
    expect(backend.calls.me).toBe(1)
  })

  it('un 403 de una API privada no termina una sesión válida', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    const { user } = renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()

    server.use(mock.get(PRIVATE_PATH, () => problemResponse(403)))
    await user.click(screen.getByRole('button', { name: 'Recargar datos' }))

    expect(await screen.findByText(/No tenés permiso/)).toBeVisible()
    expect(within(banner()).getByText('Persona A')).toBeVisible()
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).not.toBeInTheDocument()
  })
})

describe('Cierre de sesión', () => {
  it('deshabilita el botón mientras pende; 204 limpia cache, obtiene CSRF anónimo y navega a /login', async () => {
    const backend = installAuthBackend({ user: personaA })
    const privateApi = installPrivateApi(backend)
    const { user, queryClient } = renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()
    const button = within(banner()).getByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(button).toBeEnabled())

    const releaseInFlight = privateApi.hold()
    await user.click(screen.getByRole('button', { name: 'Recargar datos' }))
    const releaseLogout = holdNext('post', LOGOUT_PATH)
    await user.click(button)

    expect(within(banner()).getByRole('button', { name: 'Cerrando sesión…' })).toBeDisabled()
    releaseLogout()
    expect(await screen.findByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible()
    releaseInFlight()

    expect(backend.state.user).toBeNull()
    expect(backend.calls).toMatchObject({ logout: 1, csrf: 2 })
    expect(document.cookie).toContain('XSRF-TOKEN=csrf-ficticio-2')
    expect(within(banner()).queryByText('Persona A')).not.toBeInTheDocument()
    expect(screen.queryByText('La sesión terminó. Volvé a ingresar.')).not.toBeInTheDocument()
    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined()
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
    expect(queryClient.getQueryData(authQueryKeys.session)).toBeNull()
  })

  it.each([
    ['red caída', () => HttpResponse.error(), 'No se pudo conectar con el servidor'],
    ['error del servidor', () => problemResponse(503), 'El servidor no está disponible'],
  ])(
    'con %s conserva la sesión y el mensaje, y el reintento la cierra',
    async (_c, reply, text) => {
      const backend = installAuthBackend({ user: personaA })
      installPrivateApi(backend)
      server.use(mock.post(LOGOUT_PATH, reply, { once: true }))
      const { user } = renderSession()
      const button = await within(banner()).findByRole('button', { name: 'Cerrar sesión' })
      await waitFor(() => expect(button).toBeEnabled())

      await user.click(button)

      const alert = await findAlert(/No se pudo confirmar el cierre de sesión/)
      expect(alert).toHaveTextContent(text)
      expect(within(banner()).getByText('Persona A')).toBeVisible()
      expect(screen.getByText('Datos de Persona A')).toBeVisible()
      expect(backend.state.user).not.toBeNull()

      await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

      expect(await screen.findByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible()
      expect(backend.state.user).toBeNull()
    },
  )

  it('un 403 por CSRF vencido pide reintento explícito sin reenviar; el reintento cierra', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    const { user } = renderSession()
    const button = await within(banner()).findByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(button).toBeEnabled())
    // El server rotó la sesión y borró la cookie CSRF después de que la SPA la obtuvo.
    backend.login(personaA)

    await user.click(button)

    const alert = await findAlert(/No se pudo confirmar el cierre de sesión/)
    expect(alert).toHaveTextContent(
      'La operación fue rechazada y no se aplicó. Volvé a intentarla.',
    )
    expect(backend.calls.logout).toBe(1)
    expect(within(banner()).getByText('Persona A')).toBeVisible()

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible()
    expect(backend.calls.logout).toBe(2)
  })

  it('un 401 comprobado en el cierre aplica la expiración en lugar de un error de cierre', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    server.use(
      mock.post(
        LOGOUT_PATH,
        () => {
          // La sesión ya había vencido en el server cuando llegó el cierre.
          backend.expireSession()
          return problemResponse(401)
        },
        { once: true },
      ),
    )
    const { user } = renderSession()
    const button = await within(banner()).findByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(button).toBeEnabled())

    await user.click(button)

    expect(await screen.findByText('La sesión terminó. Volvé a ingresar.')).toBeVisible()
    expect(screen.queryByText(/No se pudo confirmar el cierre de sesión/)).not.toBeInTheDocument()
    expect(within(banner()).queryByText('Persona A')).not.toBeInTheDocument()
    expect(screen.queryByText('Datos de Persona A')).not.toBeInTheDocument()
  })

  it('se activa con el teclado', async () => {
    const backend = installAuthBackend({ user: personaA })
    installPrivateApi(backend)
    const { user } = renderSession()
    const button = await within(banner()).findByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(button).toBeEnabled())

    while (document.activeElement !== button) await user.tab()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible()
  })
})

describe('Identidades consecutivas', () => {
  it('tras cerrar sesión, la segunda identidad no ve la cache de la primera', async () => {
    const backend = installAuthBackend({ user: personaA })
    const privateApi = installPrivateApi(backend)
    const { user } = renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()
    const button = within(banner()).getByRole('button', { name: 'Cerrar sesión' })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    expect(await screen.findByRole('heading', { name: 'Ingresar a StockPilot' })).toBeVisible()

    backend.login(personaB)
    regainFocus()
    expect(await screen.findByRole('heading', { name: 'Ya iniciaste sesión' })).toBeVisible()
    const releaseB = privateApi.hold()
    await user.click(screen.getByRole('link', { name: 'Ir al inicio' }))

    expect(screen.getByText('Cargando datos privados…')).toBeVisible()
    expect(screen.queryByText('Datos de Persona A')).not.toBeInTheDocument()
    releaseB()
    expect(await screen.findByText('Datos de Persona B')).toBeVisible()
    await waitFor(() =>
      expect(within(banner()).getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled(),
    )
    expect(backend.calls.csrf).toBe(3)
  })

  it('si otra pestaña cambia la identidad, la cache de la anterior se descarta antes de mostrarla', async () => {
    const backend = installAuthBackend({ user: personaA })
    const privateApi = installPrivateApi(backend)
    renderSession()
    expect(await screen.findByText('Datos de Persona A')).toBeVisible()

    backend.login(personaB)
    const releaseB = privateApi.hold()
    regainFocus()

    expect(await within(banner()).findByText('Persona B')).toBeVisible()
    expect(screen.getByText('Cargando datos privados…')).toBeVisible()
    expect(screen.queryByText('Datos de Persona A')).not.toBeInTheDocument()
    releaseB()
    expect(await screen.findByText('Datos de Persona B')).toBeVisible()
    await waitFor(() => expect(backend.calls.csrf).toBe(2))
    expect(document.cookie).toContain('XSRF-TOKEN=csrf-ficticio-2')
  })
})
