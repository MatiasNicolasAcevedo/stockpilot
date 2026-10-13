import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError, UnexpectedResponseError } from '../services/http'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it.each([401, 403, 404, 400, 409])('no reintenta respuestas %i', (status) => {
    expect(shouldRetry(0, new ApiError(status, null))).toBe(false)
  })

  it('no reintenta respuestas fuera de contrato', () => {
    expect(shouldRetry(0, new UnexpectedResponseError('x'))).toBe(false)
  })

  it('reintenta red y 5xx hasta dos veces', () => {
    expect(shouldRetry(0, new NetworkError(new TypeError('failed')))).toBe(true)
    expect(shouldRetry(1, new ApiError(503, null))).toBe(true)
    expect(shouldRetry(2, new ApiError(503, null))).toBe(false)
  })
})
