import { describe, expect, it, vi } from 'vitest'
import { createSessionEvents } from './sessionEvents'

describe('createSessionEvents', () => {
  it('notifica a los suscriptores y deja de hacerlo al desuscribirse', () => {
    const events = createSessionEvents()
    const listener = vi.fn()
    const unsubscribe = events.onUnauthorized(listener)

    events.notifyUnauthorized({ path: '/api/v1/auth/me', method: 'GET' })
    unsubscribe()
    events.notifyUnauthorized({ path: '/logout', method: 'POST' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ path: '/api/v1/auth/me', method: 'GET' })
  })

  it('tolera que un suscriptor se desuscriba durante la notificación', () => {
    const events = createSessionEvents()
    const second = vi.fn()
    const unsubscribeFirst = events.onUnauthorized(() => unsubscribeFirst())
    events.onUnauthorized(second)

    events.notifyUnauthorized({ path: '/logout', method: 'POST' })
    events.notifyUnauthorized({ path: '/logout', method: 'POST' })

    expect(second).toHaveBeenCalledTimes(2)
  })
})
