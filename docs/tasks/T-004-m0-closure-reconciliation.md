---
id: T-004
status: in_progress
priority: P0
size: S
milestone: M0
product_cycle: null
counts_for_cycle: false
spec: null
spec_version: null
depends_on: [T-003]
branch: docs/T-004-m0-closure-reconciliation
risk: standard
role: implementer
executor: frontier
pr: null
---
# T-004 · Reconciliación del cierre técnico de M0

## Checkpoint de inicio e impacto · 2026-10-17
- Rol: planner/implementer documental de frontera en sesión nueva desde la raíz. Opus 5.5 (`claude-opus-5-5`) en Claude Code (app de escritorio); esfuerzo efectivo no expuesto (high recomendado, no simulado). Sin otra sesión/modelo/delegación. Distinta de la sesión revisora/merger de T-003.
- Precondición del prompt de STATUS (caso b) reconciliada antes de editar: árbol limpio en `main` sin heredados, HEAD local = `origin/main` = `8cbdaab6a3f3f24e7c14704c9a5a86b0eaca4460`. `gh pr view 4`: `MERGED` el 2026-10-17T04:01:59Z, merge commit `8cbdaab`, HEAD `819ce26cde7b60e956dae58503d0359f351c0e80`, base `512bfd9c6b143aa484ddce72aad64bb9484e6330`, iguales a los del [veredicto APROBADO ronda 1](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/4#issuecomment-6229387823); [comentario de cierre del merger](https://github.com/MatiasNicolasAcevedo/stockpilot/pull/4#issuecomment-6229454621) publicado. CI de main [39001033419](https://github.com/MatiasNicolasAcevedo/stockpilot/actions/runs/39001033419) sobre `8cbdaab`: classify/docs-check/server/client/e2e/verify-required SUCCESS. Sin PRs abiertos; ramas remotas de T-002/T-003 ya borradas. Ruleset `main-protection` activo, sin bypass; ajustes del repo sin cambios (solo squash, borrado de ramas, sin auto-merge, público). Todos los comentarios de #4 son del dueño/sesiones propias.
- Próximo ID libre: T-004. Tarea **no comercial**: `milestone: M0`, `counts_for_cycle: false`, `spec: null`.
- **Impacto antes de editar:** solo documentación (Markdown de la allowlist DOCS_ONLY). T-003 → `done`; HANDOFF v2 reconciliado criterio por criterio según el veredicto ronda 1 más G-03/H-03 con MERGED, CI FULL de main y comentario de cierre; veredicto v2 `CIERRE_TECNICO_VERIFICADO` solo si queda 22/22; observaciones no bloqueantes de la revisión (AGENTS «21 criterios» y líneas Junie históricas, ARCHITECTURE/ADR 0003 «aceptación pendiente», README de estado, BACKLOG con ítems resueltos por T-003); revisión de ciclo de ROADMAP por cierre de hito; STATUS con el prompt de revisión de T-004 y, tras su merge, consolidación del kit local con precondición explícita. Sin cambios de código, scripts, CI, configuración, contratos API/S-001/ADR (decisiones), permisos/propiedad, datos/migraciones ni UI. AUTONOMY, ruleset y ajustes intactos. Sin negocio M1…M3/S-002, sin recepción Junie, sin renombrar/archivar.

## Objetivo y evidencia
Dejar en `main` el cierre técnico de M0 reconciliado con hechos de GitHub: T-003 `done`, HANDOFF v2 con evidencia real por criterio y veredicto acorde al conteo, documentos coherentes con el objetivo vigente del dueño (2026-10-16) y una continuidad única hacia kit local → starter genérico → constancia de detención antes de Junie. Fuentes: [contrato v2 y secuencia posterior al merge de T-003](T-003-e2e-gate-and-handoff.md#secuencia-posterior-al-merge), veredicto ronda 1 y cierre del merger en PR #4.

## Alcance
Incluye: tarea, STATUS, BACKLOG, HANDOFF, ROADMAP, T-003 (estado y AC-12 v2), AGENTS raíz (coherencia de reglas ya decididas por el dueño), ARCHITECTURE, ADR 0003 (solo estado de aceptación) y README (estado).
No incluye: código, scripts, CI, configuración, AUTONOMY, ruleset/ajustes, kit, starter, constancia de detención, negocio, recepción Junie ni operar el stack ordinario/`stockpilot_db-data`/Google real.

## Leer antes
- [T-003 · checkpoint de revisión ronda 1 y contrato v2](T-003-e2e-gate-and-handoff.md)
- [HANDOFF · checklist v2](../HANDOFF.md#checklist-v2-de-cierre-técnico)
- [ROADMAP · política de revisión](../ROADMAP.md#política-de-revisión-del-backlog-y-del-alcance)
- [TESTING · políticas de CI](../TESTING.md#políticas-de-verificación-en-ci-verify-required)
- [AUTONOMY · condiciones de merge](../AUTONOMY.md#condiciones-obligatorias-de-merge)

## Aceptación y pruebas
| ID | Criterio | Comprobación | Evidencia real |
|---|---|---|---|
| AC-01 | T-003 `done` en frontmatter, BACKLOG (Hechas recientes) y STATUS, con PR #4/merge `8cbdaab`/CI main enlazados; AC-12 v2 con evidencia | docs-check + revisión | Registrado: T-003 `done` con reconciliación post-merge y AC-12 v2; fila en Hechas recientes; docs-check OK |
| AC-02 | HANDOFF v2: cada criterio con estado y evidencia del veredicto ronda 1; G-03 con MERGED y CI FULL de main; H-03 con comentario de cierre y prompt del kit en STATUS; `CIERRE_TECNICO_VERIFICADO` solo con 22/22; v1 congelado `NO_LISTO` 9/21; S-03 sigue pendiente externo del dueño (Google real no probado) | docs-check (conteo/veredicto/origen/texto conservado) + revisión | Registrado: 22 filas v2 con evidencia/responsable, texto y origen intactos (docs-check), veredicto `CIERRE_TECNICO_VERIFICADO` 22/22; v1 9/21; S-03 externo |
| AC-03 | Observaciones no bloqueantes de la revisión resueltas sin cambiar decisiones: AGENTS sin «21 criterios» como checklist vigente y con Junie marcada histórica; ARCHITECTURE/ADR 0003 con la aceptación independiente registrada; BACKLOG sin ítems resueltos por T-003 | `rg` de las frases + revisión | Registrado: AGENTS (Junie histórica, checklist v2 de 22), ARCHITECTURE (E2E y ADR 0003), estado de ADR 0003, README (estado y stack); BACKLOG sin las tres filas resueltas, listadas en la fila de T-003 |
| AC-04 | Revisión de ciclo por cierre de hito registrada en ROADMAP (corte, balance, próximo tramo, decisiones pendientes) sin abrir negocio | revisión | Registrado: corte 2026-10-17 en «Ciclo de producto» y M0 cerrado técnicamente |
| AC-05 | STATUS deja un único prompt con precondiciones explícitas: revisión/merger de T-004 y, tras su MERGED, consolidación del kit local; orden kit → starter genérico validado/publicado desde copia limpia con contexto ficticio distinto → constancia de detención; nunca prompt Junie | docs-check (prompt sin placeholders, menciona T-004) + revisión | Registrado: prompt único con casos A/B; docs-check sin placeholders |
| AC-06 | Gate según TESTING: política del diff DOCS_ONLY, docs-check verde; como reconciliación del cierre de M0, además FULL local desde clon limpio del HEAD publicado; CI del HEAD final ready con `verify-required` SUCCESS | `bash scripts/verify.sh --policy`, `--docs`, FULL en clon limpio, gh | pendiente |

Política de gate: el diff es solo Markdown de la allowlist, así que la CI aplica `DOCS_ONLY`. No se reducen suites, asserts ni umbrales.

## Checkpoint de implementación
- Sesiones (rol · modelo · herramienta): planner/implementer documental de frontera · Opus 5.5 (`claude-opus-5-5`) · Claude Code (app de escritorio); esfuerzo efectivo no expuesto.
- Hecho: impacto registrado antes de editar; T-003 `done`; HANDOFF v2 22/22 `CIERRE_TECNICO_VERIFICADO` con evidencia de la revisión ronda 1, G-03 (MERGED + CI FULL de main) y H-03 (cierre del merger + prompt del kit); observaciones no bloqueantes (i) resueltas, (ii)/(iii) registradas sin acción en T-003; BACKLOG con T-004 en vuelo, T-003 en hechas y tres ítems resueltos retirados; corte ROADMAP; STATUS con prompt único A/B.
- Archivos propios: esta tarea, T-003, STATUS, BACKLOG, HANDOFF, ROADMAP, ARCHITECTURE, ADR 0003, AGENTS raíz y README. Sin cambios heredados. Kit sin cambios en esta sesión (la consolidación es la próxima tarea fuera del repo).
- Pruebas: `node scripts/docs-check.mjs` OK (39 Markdown, 5 tareas, v1 9/21, v2 22/22). `bash scripts/verify.sh --docs` con `COMPOSE_ENV_FILES=.env.example` y proyecto `stockpilot-t004-docs` exit 0; red propia retirada, cero contenedores/redes/volúmenes por label. Log `$TEMP/stockpilot-T004-docs.log`.
- Pendiente: commit de rutas explícitas, push, PR draft; política del diff contra main; FULL local en clon limpio del HEAD publicado (cierre de M0 siempre FULL según TESTING, aunque la CI clasifique el diff como DOCS_ONLY); ready tras la CI draft; CI del HEAD final con `verify-required` SUCCESS; comentario de publicación con SHA/base/resultados.
- Bloqueos: ninguno.
- Rama / PR: `docs/T-004-m0-closure-reconciliation` · PR pendiente de crear.
- Último commit conocido: `8cbdaab` (base main).
- Próximo comando: `git add` explícito de los diez archivos, commit y push.
