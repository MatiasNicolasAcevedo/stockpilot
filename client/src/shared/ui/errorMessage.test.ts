import { describe, expect, it } from 'vitest'
import { CsrfRenewalRequiredError } from '../../features/auth/api'
import { ApiError, NetworkError, UnexpectedResponseError } from '../../services/http'
import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it.each([
    [new CsrfRenewalRequiredError(new ApiError(403, null)), 'no se aplicó. Volvé a intentarla.'],
    [new NetworkError(new TypeError('failed')), 'No se pudo conectar con el servidor'],
    [new ApiError(401, null), 'Tu sesión no está activa'],
    [new ApiError(403, null), 'No tenés permiso'],
    [new ApiError(502, null), 'El servidor no está disponible'],
    [new ApiError(409, { detail: 'El código ya existe.' }), 'El código ya existe.'],
    [new ApiError(400, null), 'No se pudo completar la solicitud.'],
    [new UnexpectedResponseError('x'), 'El servidor respondió de forma inesperada'],
    [new Error('interno'), 'Ocurrió un error inesperado'],
  ])('%o → mensaje en español sin detalles técnicos', (error, expected) => {
    expect(errorMessage(error)).toContain(expected)
  })
})
