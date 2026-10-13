import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Rutas que el origen público reenvía al server; deben coincidir con nginx.conf (build servido por el contenedor client).
const proxiedPaths = ['/api/', '/oauth2/', '/login/oauth2/code/', '/logout']
// En el contenedor client-dev apunta a http://server:8080; en el host, al server publicado en loopback.
const apiTarget = process.env.STOCKPILOT_API_TARGET ?? 'http://127.0.0.1:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // xfwd agrega X-Forwarded-*; el Host del navegador se conserva (changeOrigin false) para cookies y OIDC.
    proxy: Object.fromEntries(
      proxiedPaths.map((path) => [path, { target: apiTarget, xfwd: true }]),
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
})
