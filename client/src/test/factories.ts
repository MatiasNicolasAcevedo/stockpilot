import { HttpResponse } from 'msw'
import type { SystemInfo } from '../features/system/api'
import type { FieldError, ProblemDetail } from '../services/http'

// Datos ficticios para pruebas; nunca datos reales.

export function buildSystemInfo(overrides: Partial<SystemInfo> = {}): SystemInfo {
  return { name: 'StockPilot', version: '0.0.1-TEST', ...overrides }
}

export function buildProblem(
  status: number,
  overrides: Partial<ProblemDetail> = {},
): ProblemDetail {
  return { type: 'about:blank', title: 'Error', status, ...overrides }
}

/** Respuesta 400 como la de shared/error/ApiExceptionHandler del server. */
export function validationProblemResponse(errors: FieldError[]) {
  return HttpResponse.json(
    buildProblem(400, {
      title: 'Bad Request',
      detail: 'La solicitud tiene datos inválidos.',
      errors,
    }),
    { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

export function problemResponse(status: number, overrides: Partial<ProblemDetail> = {}) {
  return HttpResponse.json(buildProblem(status, overrides), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}
