import type { HttpMethod } from './http'

/** Una petición recibió 401: el server no reconoce una sesión para ella. */
export interface UnauthorizedEvent {
  path: string
  method: HttpMethod
}

export type UnauthorizedListener = (event: UnauthorizedEvent) => void

/**
 * Canal explícito de 401. El cliente HTTP notifica aquí y rechaza la petición sin reintentar; quien conoce el estado de
 * la sesión decide qué significa: con un usuario autenticado es una expiración, para un visitante es la respuesta
 * esperada de `me`. 403, red y 5xx nunca se notifican: no prueban que la sesión haya terminado.
 */
export interface SessionEvents {
  /** Devuelve la función que cancela la suscripción. */
  onUnauthorized(listener: UnauthorizedListener): () => void
  notifyUnauthorized(event: UnauthorizedEvent): void
}

export function createSessionEvents(): SessionEvents {
  const listeners = new Set<UnauthorizedListener>()
  return {
    onUnauthorized(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    notifyUnauthorized(event) {
      // Copia: un listener puede desuscribirse mientras se notifica.
      for (const listener of [...listeners]) listener(event)
    },
  }
}

/** Canal de la aplicación, conectado al cliente `http`. */
export const sessionEvents = createSessionEvents()
