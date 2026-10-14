# Runner E2E

T-003 A materializa stack/runner. Recorridos de producto B y gate FULL C pendientes. `bash scripts/e2e.sh --harness` acredita únicamente arranque real de Chromium/SPA compilada y readiness API/proveedor. `bash scripts/e2e.sh` ejecuta `npm test` y falla mientras B no tenga tests; no convierte ausencia de tests en verde.

Compose combina base/auth/overlay E2E, env-file ficticio explícito y proyecto validado `stockpilot-e2e-<único>`. Rechaza recursos preexistentes y retira solo su red/volúmenes/contenedores, incluidos detenidos. Sin puertos host. Chromium comparte el namespace de red de nginx; `http://localhost` coincide en browser/proxy/backend/callback. Issuer `http://host.docker.internal:8090/default` idéntico en todo el flujo, resuelto por alias al proveedor. Sin hosts globales.

Imagen y paquete Playwright fijados a 1.64.0; `npm ci` instala durante build. No descarga dependencias durante escenarios. `init` evita zombies; `shm_size: 1gb` conserva IPC propio sin compartir el del host. Browser no monta socket Docker.

Config: `forbidOnly`, cero retries, un worker, contextos nuevos por test, Chromium 1280/375 px. Retiene trace/screenshot en fallo y reportes HTML/JUnit. Bind mount `e2e/artifacts/<proyecto>` exporta antes del cleanup. Son locales/ignorados: traces pueden contener cookies/parámetros OIDC; B debe sanear/revisar antes de publicar. Sin `storageState`/identidades reales. A no afirma AC-06 completo ni FULL.

`bash scripts/test-e2e-lifecycle.sh` delega al Docker real; adaptador exclusivo de test inyecta server exit42 en startup, detiene backend antes de readiness, envía TERM y reporta error de cleanup después de retirar recursos. Exige nonzero, señal 143, cero recursos propios, segunda ejecución y rechazo del proyecto ordinario. Runner rojo usa ausencia actual de B: al incorporar tests, sustituir el disparador por fallo explícito sin debilitar la aceptación ni contar harness como producto.
