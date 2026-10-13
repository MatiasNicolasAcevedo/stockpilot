---
id: T-002
status: draft
priority: P0
size: L
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: [T-001]
branch: feat/T-002-google-auth
risk: elevated
role: planner
executor: frontier
pr: null
---
# T-002 · Google OIDC, sesión, CSRF e identidad local

**Borrador:** se refina al tomarla, con la base de T-001 ya integrada. Resultados esperados (PROJECT_CONTEXT §3 y §8):

- Spec `docs/specs/S-001-auth-google.md` con permisos, estados de UI y matriz criterio → test; ADR 0002 de sesión, cookie (`HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS) y CSRF para la SPA (comprobar `csrf.spa()` en Spring Security 7.1.1).
- OAuth2 Login con Google (`openid profile email`), callback real, alta/recuperación de `app_user` por `(issuer, subject)` sin fusionar por email, `GET /api/v1/auth/me` con DTO sin credenciales, logout POST con CSRF que invalida la sesión, 401/403 JSON y redirects solo internos.
- Proveedor OIDC local `navikt/mock-oauth2-server` con tag fijo, solo en perfiles `test`/`e2e`, con discovery/JWKS alcanzables desde navegador y backend sin desactivar validaciones; el perfil real no puede seleccionarlo.
- Pruebas: unitarios de vinculación de identidad, slices con `oidcLogin()` (permisos, 401/403, CSRF), integración del protocolo con el proveedor local (callback, sesión, recarga, logout) y negativos (state/nonce, issuer/audience, token inválido, cancelación). Client: botón «Continuar con Google», estado de sesión, logout que limpia la cache de Query, manejo visible de 401.
- Variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_PUBLIC_URL` en `.env.example` con valores ficticios; guía exacta para el dueño (cliente web OAuth, URIs autorizadas). Smoke con Google real queda como pendiente externo (HANDOFF S-03) si no hay credenciales.
