# Estado del proyecto
Actualizado: 2026-10-12 (UTC-3) · sesión: implementación T-000 · Opus 5.5 / Claude Code · checkpoint publicado: no

## Próxima acción
| Campo | Valor |
|---|---|
| Acción | Implementar |
| Tarea y contrato | T-000 · [tasks/T-000-governance-and-server-foundation.md](tasks/T-000-governance-and-server-foundation.md) |
| Estado | `in_progress` |
| Ejecutor | Frontera (GPT-6.1 Sol u Opus 5.5) · implementer |
| Rama / PR | `chore/T-000-governance-and-server-foundation` · PR pendiente |
| Hecho remoto comprobado | `main` = `2d06bbb` (ancla) en GitHub, 2026-10-12 |
| Bloqueo | ninguno |

**M0:** bloque actual T-000 (gobierno + base server) · Verificados: 2/21 · pendientes: C-02, C-03, E-01, E-02, E-03, B-01, B-03, S-01, S-02, S-03, V-01, V-02, V-03, G-01, G-02, G-03, H-01, H-02, H-03 · bloqueados: ninguno · detalle en [HANDOFF.md](HANDOFF.md).

### Prompt de la siguiente sesión
```text
Continuá la preparación de StockPilot como modelo de frontera (GPT-6.1 Sol u Opus 5.5, esfuerzo high) desde la raíz del repo. Registrá modelo y herramienta. Leé AGENTS.md, docs/STATUS.md, docs/BACKLOG.md, docs/tasks/T-000-governance-and-server-foundation.md y docs/agents/implementer.md. Retomá T-000 en la rama chore/T-000-governance-and-server-foundation desde su checkpoint: gate local con bash scripts/verify.sh, commit de rutas explícitas, push, PR draft, CI y verify-required como check requerido. Verificá antes de cada commit que git ls-files -- plantilla esté vacío. No inicies otra tarea.
```

## Salud
| Check | Último resultado | Commit/base evaluados | Evidencia |
|---|---|---|---|
| Back: unitarios + integración | OK (3 + 7, BUILD SUCCESS) | Árbol de T-000 sobre `2d06bbb` | `server-tests` en Compose, 2026-10-12 |
| Front: unitarios/componentes | no materializado | — | T-001 |
| Build/lint | Spotless OK; client pendiente | Árbol de T-000 | — |
| Playwright desktop/mobile | no materializado | — | T-003 |
| CI y docs-check | pendiente | — | — |
| Cobertura back/front | back 83 % líneas (umbral M0 = 0) / front — | Árbol de T-000 | JaCoCo combinado |

## Checkpoint breve
Hecho: Git + ancla, repo público y ruleset, docs de gobierno, base server con Compose y Testcontainers. Pendiente: gate local, PR, CI y check requerido. Próximo comando: `bash scripts/verify.sh`.

## Últimas sesiones
- 2026-10-12 · implementación T-000 · Opus 5.5 / Claude Code · inventario, ancla, repo, base server y documentación.
