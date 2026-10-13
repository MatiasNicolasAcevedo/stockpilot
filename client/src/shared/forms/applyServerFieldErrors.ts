import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../../services/http'

/** Clave de RHF para errores del servidor que no corresponden a un campo del formulario (`formState.errors.root.server`). */
export const SERVER_ROOT_ERROR = 'root.server'

/**
 * Vuelca `errors[{field, message}]` de un ProblemDetail de validación en React Hook Form: cada mensaje queda junto a su
 * campo y el foco va al primero. Los campos desconocidos se agrupan en `root.server`. Devuelve false si el error no
 * trae errores de campo, para que el llamador muestre el error general.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) return false

  const applied = new Set<string>()
  const unmatched: string[] = []
  for (const { field, message } of error.fieldErrors) {
    const target = fields.find((name) => name === field)
    if (target === undefined) {
      unmatched.push(message)
    } else if (!applied.has(target)) {
      setError(target, { type: 'server', message }, { shouldFocus: applied.size === 0 })
      applied.add(target)
    }
  }
  if (unmatched.length > 0) {
    setError(SERVER_ROOT_ERROR, { type: 'server', message: unmatched.join(' ') })
  }
  return true
}
