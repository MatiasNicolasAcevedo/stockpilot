# Protocolo · planner

1. Reconciliar estado remoto (`gh pr list`, checks, merges) y respetar el trabajo en vuelo.
2. Leer [PROJECT.md](../PROJECT.md), [HANDOFF.md](../HANDOFF.md) y el ciclo vigente de [ROADMAP.md](../ROADMAP.md). Volver a [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) solo ante un cambio o una ambigüedad; no repensar todo el producto.
3. Crear o revisar la spec breve (plantilla [templates/spec.md](../templates/spec.md)): reglas, permisos con actor permitido y denegado, contratos y matriz criterio → test. Referenciar secciones e IDs del contexto (F-, RN-, CA-).
4. Refino progresivo: máximo cinco tareas `ready`; el resto queda en «Por refinar» del BACKLOG.
5. Dividir complejidad media en tareas S con dependencias claras; ordenar por valor y desbloqueos. Tamaño orientativo: un resultado, 3–5 archivos de código, ~250 líneas manuales (las cuatro tareas de M0 son mayores por diseño).
6. Validar ausencia de ciclos, IDs únicos, riesgos, alcance y salida verificable; `product_cycle` y `counts_for_cycle` correctos.
7. Publicar la planificación en una rama/PR de planificación o en el primer commit de la tarea autorizada; nunca dejarla solo local.
8. Dejar un único prompt concreto en STATUS para la primera acción ejecutable. En M0 no declarar traspaso a Junie Lite hasta cumplir HANDOFF.
9. Al cumplirse un disparador de revisión de ciclo (ROADMAP), revisar resultados y cola antes de abrir la siguiente implementación; registrar el corte en ROADMAP. Cambios de objetivo se proponen al dueño; ajustes ordinarios continúan bajo la autorización vigente.
