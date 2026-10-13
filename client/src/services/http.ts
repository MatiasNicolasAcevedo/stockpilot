import { z } from 'zod'

/**
 * Único cliente HTTP de la SPA. El navegador habla solo con su origen (el contenedor client reenvía /api al server),
 * así que la cookie de sesión viaja con `credentials: 'same-origin'` y no hay CORS. `fetch` no rechaza por 4xx/5xx:
 * aquí se convierten en errores tipados. Toda respuesta con cuerpo se valida con un esquema Zod.
 */

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() })

/** RFC 9457. `errors` lo agrega el server para errores de validación (shared/error/ApiExceptionHandler). */
export const problemDetailSchema = z.looseObject({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().int().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
})

export type FieldError = z.infer<typeof fieldErrorSchema>
export type ProblemDetail = z.infer<typeof problemDetailSchema>

/** El server respondió con un estado no exitoso. `problem` es null si el cuerpo no era un ProblemDetail (p. ej. 502 del proxy). */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null) {
    super(problem?.detail ?? problem?.title ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get fieldErrors(): FieldError[] {
    return this.problem?.errors ?? []
  }
}

/** No hubo respuesta: red caída o servidor inalcanzable. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('No se pudo contactar al servidor', { cause })
    this.name = 'NetworkError'
  }
}

/** Respuesta exitosa cuyo cuerpo no cumple el contrato esperado. */
export class UnexpectedResponseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'UnexpectedResponseError'
  }
}

export interface CsrfToken {
  headerName: string
  token: string
}

/**
 * Punto de extensión del token CSRF para métodos que cambian estado. T-002 fija el mecanismo (ADR 0002) y configura
 * aquí cómo leerlo; mientras tanto no se envía ningún header y el server responde 403 a esas peticiones.
 */
export type CsrfTokenResolver = () => CsrfToken | null

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  /** Se serializa como JSON. */
  body?: unknown
  /** Cancela la petición (TanStack Query lo provee en `queryFn`). El aborto se propaga tal cual, sin envolverlo. */
  signal?: AbortSignal
}

export interface HttpClientOptions {
  csrfToken?: CsrfTokenResolver
  fetch?: typeof fetch
}

export interface HttpClient {
  /** Petición con cuerpo JSON validado por `schema`. */
  request<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: RequestOptions,
  ): Promise<z.output<S>>
  /** Petición sin cuerpo de respuesta esperado (204 o cuerpo ignorado). */
  requestVoid(path: string, options?: RequestOptions): Promise<void>
}

const SAFE_METHODS: ReadonlySet<HttpMethod> = new Set(['GET'])
const ACCEPT = 'application/json, application/problem+json'

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const csrfToken = options.csrfToken ?? (() => null)
  // Se resuelve en cada llamada para respetar interceptores instalados después (MSW en pruebas).
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init))

  async function send(
    path: string,
    { method = 'GET', body, signal }: RequestOptions,
  ): Promise<Response> {
    const headers = new Headers({ Accept: ACCEPT })
    let payload: string | undefined
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
      payload = JSON.stringify(body)
    }
    if (!SAFE_METHODS.has(method)) {
      const csrf = csrfToken()
      if (csrf) headers.set(csrf.headerName, csrf.token)
    }

    let response: Response
    try {
      response = await doFetch(path, {
        method,
        headers,
        body: payload,
        signal,
        credentials: 'same-origin',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new NetworkError(error)
    }
    if (!response.ok) throw new ApiError(response.status, await readProblem(response, signal))
    return response
  }

  return {
    async request(path, schema, requestOptions = {}) {
      const response = await send(path, requestOptions)
      const text = await response.text()
      if (text === '') throw new UnexpectedResponseError(`Respuesta vacía de ${path}`)
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch (error) {
        throw new UnexpectedResponseError(`Respuesta no JSON de ${path}`, error)
      }
      const parsed = schema.safeParse(json)
      if (!parsed.success) {
        throw new UnexpectedResponseError(`Respuesta fuera de contrato de ${path}`, parsed.error)
      }
      return parsed.data
    },
    async requestVoid(path, requestOptions = {}) {
      const response = await send(path, requestOptions)
      // Consume el cuerpo para liberar la conexión; su contenido no forma parte del contrato.
      await response.text()
    },
  }
}

async function readProblem(
  response: Response,
  signal?: AbortSignal,
): Promise<ProblemDetail | null> {
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('json')) return null
  try {
    const parsed = problemDetailSchema.safeParse(JSON.parse(await response.text()))
    return parsed.success ? parsed.data : null
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

/** Instancia de la aplicación. T-002 agrega aquí `csrfToken` según el mecanismo de sesión acordado. */
export const http = createHttpClient()
