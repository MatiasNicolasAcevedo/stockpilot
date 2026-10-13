import { QueryClient } from '@tanstack/react-query'
import { ApiError, UnexpectedResponseError } from '../services/http'

const MAX_RETRIES = 2

/**
 * Reintenta solo fallas transitorias (red o 5xx). Nunca 401/403/404/validación ni respuestas fuera de contrato:
 * repetirlas no cambia el resultado y demora el estado de error.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  if (error instanceof UnexpectedResponseError) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  })
}
