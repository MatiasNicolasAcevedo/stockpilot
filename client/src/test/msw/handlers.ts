import { http, HttpResponse } from 'msw'
import { buildSystemInfo } from '../factories'

/** Respuestas por defecto (camino feliz). Cada test sobrescribe con `server.use(...)` lo que necesite. */
export const handlers = [
  http.get('/api/v1/system/info', () => HttpResponse.json(buildSystemInfo())),
]
