# Orquestación y estados

Contrato mínimo para encadenar sesiones. **No hay dispatcher instalado:** la continuidad es `POR_SESION` y el dueño abre cada sesión pegando el prompt de [STATUS.md](STATUS.md#prompt-de-la-siguiente-sesión). Este documento fija los valores que validan las tareas y docs-check; no describe la configuración interna de Junie Lite.

## Estados de tarea
| Estado | Significado | Próximo rol |
|---|---|---|
| `draft` | Falta refinar contrato o dependencias | planner |
| `ready` | Contrato completo, dependencias cumplidas, puede tomarse | implementer |
| `in_progress` | Misma tarea, rama y PR activos | implementer |
| `in_review` | Implementación publicada; revisión pendiente | reviewer |
| `changes_requested` | Hallazgos concretos; conserva rama y PR | implementer |
| `mergeable` | Veredicto vigente y checks verdes; merge pendiente | merger (normalmente la sesión revisora) |
| `done` | GitHub confirma MERGED y el cierre documental está reconciliado | planner / siguiente tarea |
| `blocked` | Falta dato, permiso, dependencia o solución tras intentos acotados | rol indicado por el bloqueo |

- **En vuelo:** `in_progress`, `in_review`, `changes_requested`, `mergeable`, o `blocked` con `pr` asignado. Máximo una tarea en vuelo (WIP 1 tarea / 1 PR de tarea).
- `blocked` sin PR describe una tarea que espera una dependencia; no está en vuelo.
- Máximo cinco tareas `ready`. `done` nunca se usa para un PR abierto o simplemente cerrado.

## Campos de frontmatter validados
| Campo | Valores |
|---|---|
| `id` | `T-NNN` único; coincide con el nombre del archivo `docs/tasks/T-NNN-slug.md` |
| `status` | uno de los estados anteriores |
| `executor` | `frontier` (GPT-6.1 Sol u Opus 5.5; el checkpoint registra cuál) o `junie` (Junie Lite). Las tareas de M0 son `frontier` |
| `role` | `planner`, `implementer`, `reviewer`, `merger` |
| `depends_on` | lista de IDs existentes, sin ciclos |
| `product_cycle` | `null` en M0/borradores; ID de ciclo de ROADMAP antes de poner `ready` una tarea posterior a M0 |
| `counts_for_cycle` | booleano; `false` en M0, infraestructura y tareas solo documentales |
| `pr` | `null` o número de PR real |

## Resultado estructurado de una sesión (para un futuro adaptador)
```json
{
  "schema_version": 1,
  "session_id": "id-real-de-la-sesion",
  "role": "reviewer",
  "task_id": "T-000",
  "outcome": "approved",
  "head_sha": "sha-completo-del-head",
  "base_sha": "sha-completo-de-la-base",
  "pr_number": 1,
  "published": true,
  "evidence_urls": [],
  "next_action": "merge",
  "blocker": null
}
```
Si la sesión revisora también mergeó: `role: merger`, `outcome: merged`, `completed_roles: [reviewer, merger]`, `next_action: reconcile` y `merge_commit_sha` real. Un controlador valida SHAs, campos y outcomes de un conjunto cerrado y los contrasta con GitHub; nunca confía en `published` o `approved` declarados. Un JSON inválido no provoca un merge.

## Dispatcher opcional
Solo con una tarea expresa, herramientas disponibles y capacidades comprobadas (`CICLO_AUTOMATICO_VERIFICADO` en HANDOFF con evidencia). Bucle previsto: lock exclusivo por repositorio → consultar GitHub y reconciliar → si `executor: frontier` y el ejecutor disponible es Junie, guardar traspaso y parar → elegir solo la primera acción aplicable (cambios pedidos, revisión con merge elegible, retoma de merge, retoma de implementación, revisión de ciclo, primera ready, planner, cierre) → validar resultado y checkpoint → repetir con límites de sesiones/tiempo. Valores iniciales en [orchestration.example.yml](orchestration.example.yml). Logs de runtime en `.orchestrator/` (ignorado).
