import { describe, expect, it } from 'vitest'
import { createCookieCsrfTokenResolver, readCookie } from './csrf'

describe('readCookie', () => {
  it('devuelve el valor decodificado de la cookie pedida entre varias', () => {
    expect(readCookie('JSESSIONID=abc; XSRF-TOKEN=tok%3D1; theme=dark', 'XSRF-TOKEN')).toBe('tok=1')
  })

  it('no confunde cookies con nombres parecidos', () => {
    expect(readCookie('XSRF-TOKEN-OLD=a; MY-XSRF-TOKEN=b', 'XSRF-TOKEN')).toBeNull()
  })

  it.each(['', 'otra=1', 'XSRF-TOKEN=', 'XSRF-TOKEN=%E0%A4%A'])(
    'devuelve null si falta, está vacía o mal codificada: %j',
    (cookies) => {
      expect(readCookie(cookies, 'XSRF-TOKEN')).toBeNull()
    },
  )
})

describe('createCookieCsrfTokenResolver', () => {
  it('lee la cookie vigente en cada llamada y no retiene un token anterior', () => {
    const resolve = createCookieCsrfTokenResolver()
    expect(resolve()).toBeNull()

    document.cookie = 'XSRF-TOKEN=csrf-ficticio-1; Path=/'
    expect(resolve()).toEqual({ headerName: 'X-XSRF-TOKEN', token: 'csrf-ficticio-1' })

    document.cookie = 'XSRF-TOKEN=csrf-ficticio-2; Path=/'
    expect(resolve()).toEqual({ headerName: 'X-XSRF-TOKEN', token: 'csrf-ficticio-2' })

    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
    expect(resolve()).toBeNull()
  })
})
