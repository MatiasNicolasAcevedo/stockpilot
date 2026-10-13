import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import type { Plugin, ProxyOptions } from 'vite'

// Rutas que el origen público reenvía al server; deben coincidir con nginx.conf (build servido por el contenedor client).
const proxiedPaths = ['/api/', '/oauth2/', '/login/oauth2/code/', '/logout']
// En el contenedor client-dev apunta a http://server:8080; en el host, al server publicado en loopback.
const apiTarget = process.env.STOCKPILOT_API_TARGET ?? 'http://127.0.0.1:8080'

// Required for serving; builds/tests use no proxy and need no environment or credentials.
function publicOrigin() {
  const value = process.env.APP_PUBLIC_URL ?? ''
  try {
    const match = /^(https?):\/\/([^/?#]+)$/.exec(value)
    const url = new URL(value)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      !match ||
      url.username ||
      url.password ||
      url.port === '0' ||
      (url.protocol !== 'https:' && !loopback)
    ) {
      throw new Error()
    }
    return {
      authority: url.host,
      suppliedAuthority: match[2].toLowerCase(),
      host: url.hostname,
      scheme: match[1],
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    }
  } catch {
    throw new Error(
      'APP_PUBLIC_URL must be an HTTPS origin or an HTTP loopback origin without a path',
    )
  }
}

function originBoundary(authority: string, suppliedAuthority: string): Plugin {
  return {
    name: 'stockpilot-origin-boundary',
    configureServer(server) {
      // Before Vite's proxy; allowedHosts alone does not check the configured port/authority.
      server.middlewares.use((request, response, next) => {
        const host = request.headers.host?.toLowerCase()
        if (host !== authority && host !== suppliedAuthority) {
          response.writeHead(400, { 'Cache-Control': 'no-store' })
          response.end('Solicitud inválida.')
          return
        }
        next()
      })
      // Vite 8 installs its generic host rejection before configureServer (403).
      // Put the stricter exact-authority guard first; retain allowedHosts as a second check.
      const boundary = server.middlewares.stack.pop()
      if (!boundary) throw new Error('Public origin middleware registration failed')
      server.middlewares.stack.unshift(boundary)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const origin =
    command === 'serve' && !(mode === 'test' && process.env.VITEST === 'true')
      ? publicOrigin()
      : undefined
  return {
    plugins: [
      react(),
      ...(origin ? [originBoundary(origin.authority, origin.suppliedAuthority)] : []),
    ],
    server: {
      port: 5173,
      strictPort: true,
      allowedHosts: origin ? [origin.host] : [],
      // Remove the entire incoming namespace, including unknown extensions, before writing upstream headers.
      proxy: Object.fromEntries(
        proxiedPaths.map((path) => [
          path,
          {
            target: apiTarget,
            xfwd: false,
            configure(proxy) {
              proxy.on('proxyReq', (proxyRequest, request) => {
                for (const name of proxyRequest.getHeaderNames()) {
                  if (
                    name.toLowerCase() === 'forwarded' ||
                    name.toLowerCase().startsWith('x-forwarded-')
                  ) {
                    proxyRequest.removeHeader(name)
                  }
                }
                if (!origin) throw new Error('Public origin is required for the development proxy')
                proxyRequest.setHeader('Host', origin.authority)
                proxyRequest.setHeader('X-Forwarded-Host', origin.authority)
                proxyRequest.setHeader('X-Forwarded-Proto', origin.scheme)
                proxyRequest.setHeader('X-Forwarded-Port', origin.port)
                proxyRequest.setHeader('X-Forwarded-For', request.socket.remoteAddress ?? '')
              })
            },
          } satisfies ProxyOptions,
        ]),
      ),
      // Bind mounts de Windows no propagan eventos de archivos al contenedor: client-dev activa polling.
      watch:
        process.env.STOCKPILOT_WATCH_POLLING === 'true' ? { usePolling: true, interval: 300 } : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
        reporter: ['text-summary', 'html'],
        reportsDirectory: 'coverage',
      },
    },
  }
})
