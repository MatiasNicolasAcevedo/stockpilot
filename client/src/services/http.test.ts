import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { problemResponse, validationProblemResponse } from '../test/factories'
import { server } from '../test/msw/server'
import { ApiError, createHttpClient, NetworkError, UnexpectedResponseError } from './http'

const itemSchema = z.object({ id: z.string(), quantity: z.number().int() })
const PATH = '/api/v1/test/items'

describe('createHttpClient', () => {
  it('devuelve el cuerpo validado por el esquema y envía cookies del mismo origen', async () => {
    let seen: Request | undefined
    server.use(
      mock.get(PATH, ({ request }) => {
        seen = request
        return HttpResponse.json({ id: 'a-1', quantity: 3 })
      }),
    )

    const item = await createHttpClient().request(PATH, itemSchema)

    expect(item).toEqual({ id: 'a-1', quantity: 3 })
    expect(seen?.credentials).toBe('same-origin')
    expect(seen?.headers.get('Accept')).toContain('application/problem+json')
  })

  it('serializa el body como JSON', async () => {
    let body: unknown
    let contentType: string | null = null
    server.use(
      mock.post(PATH, async ({ request }) => {
        body = await request.json()
        contentType = request.headers.get('Content-Type')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await createHttpClient().requestVoid(PATH, { method: 'POST', body: { id: 'b-2' } })

    expect(body).toEqual({ id: 'b-2' })
    expect(contentType).toBe('application/json')
  })

  it('convierte un ProblemDetail en ApiError con errores de campo', async () => {
    server.use(
      mock.post(PATH, () =>
        validationProblemResponse([{ field: 'id', message: 'Ingresá un identificador.' }]),
      ),
    )

    const error = await createHttpClient()
      .requestVoid(PATH, { method: 'POST', body: {} })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'La solicitud tiene datos inválidos.',
      fieldErrors: [{ field: 'id', message: 'Ingresá un identificador.' }],
    })
  })

  it('convierte una respuesta de error no JSON (p. ej. 502 del proxy) en ApiError sin problem', async () => {
    server.use(
      mock.get(
        PATH,
        () =>
          new HttpResponse('<html>Bad Gateway</html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    )

    const error = await createHttpClient()
      .request(PATH, itemSchema)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, problem: null, fieldErrors: [] })
  })

  it('convierte una falla de red en NetworkError', async () => {
    server.use(mock.get(PATH, () => HttpResponse.error()))

    await expect(createHttpClient().request(PATH, itemSchema)).rejects.toBeInstanceOf(NetworkError)
  })

  it('acepta respuestas vacías en requestVoid y las rechaza cuando se espera un cuerpo', async () => {
    server.use(mock.delete(PATH, () => new HttpResponse(null, { status: 204 })))
    const client = createHttpClient()

    await expect(client.requestVoid(PATH, { method: 'DELETE' })).resolves.toBeUndefined()
    await expect(client.request(PATH, itemSchema, { method: 'DELETE' })).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    )
  })

  it('rechaza cuerpos fuera de contrato o no JSON con UnexpectedResponseError', async () => {
    const client = createHttpClient()
    server.use(mock.get(PATH, () => HttpResponse.json({ id: 7 })))
    await expect(client.request(PATH, itemSchema)).rejects.toBeInstanceOf(UnexpectedResponseError)

    server.use(mock.get(PATH, () => HttpResponse.text('ok')))
    await expect(client.request(PATH, itemSchema)).rejects.toBeInstanceOf(UnexpectedResponseError)
  })

  it('propaga el aborto sin convertirlo en error de red', async () => {
    server.use(mock.get(PATH, () => new Promise<never>(() => {})))
    const controller = new AbortController()

    const pending = createHttpClient().request(PATH, itemSchema, { signal: controller.signal })
    controller.abort()

    const error = await pending.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(NetworkError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  it('agrega el header CSRF solo en métodos que cambian estado', async () => {
    const headers: Record<string, string | null> = {}
    server.use(
      mock.get(PATH, ({ request }) => {
        headers.get = request.headers.get('X-Test-Csrf')
        return HttpResponse.json({ id: 'c-3', quantity: 1 })
      }),
      mock.post(PATH, ({ request }) => {
        headers.post = request.headers.get('X-Test-Csrf')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const client = createHttpClient({
      csrfToken: () => ({ headerName: 'X-Test-Csrf', token: 'token-ficticio' }),
    })

    await client.request(PATH, itemSchema)
    await client.requestVoid(PATH, { method: 'POST' })

    expect(headers).toEqual({ get: null, post: 'token-ficticio' })
  })

  it('sin resolver de CSRF no envía header y el 403 llega como ApiError', async () => {
    server.use(
      mock.post(PATH, ({ request }) =>
        request.headers.has('X-Test-Csrf')
          ? new HttpResponse(null, { status: 204 })
          : problemResponse(403, { detail: 'No tenés permiso para realizar esta operación.' }),
      ),
    )

    await expect(createHttpClient().requestVoid(PATH, { method: 'POST' })).rejects.toMatchObject({
      status: 403,
    })
  })
})
