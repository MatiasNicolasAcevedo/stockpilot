# Protocolo · merger

Normalmente continúa la sesión revisora que aprobó. También puede retomarse en una sesión nueva si quedaron CI, permisos o un merge manual pendientes. Antes de reintentar, consultar si el PR ya está mergeado (`gh pr view <n> --json state,mergeCommit`): en ese caso solo reconciliar.

1. Comprobar autorización ([AUTONOMY.md](../AUTONOMY.md)), diff final, HEAD/base, veredicto `APROBADO` vigente, checks requeridos verdes, conversaciones y ausencia de cambios locales propios.
2. Si cambió HEAD o base desde el veredicto, devolver a revisión/verificación. No reutilizar una aprobación vieja.
3. Squash merge ligado al SHA revisado, sin `--admin`: `gh pr merge <número> --squash --delete-branch --match-head-commit <sha-revisado>` con valores reales.
4. Confirmar en GitHub `state: MERGED`, fecha y SHA del commit de merge. Un exit code exitoso no basta. Si quedó en cola, esperar sin empezar otra tarea.
5. Publicar en el PR un comentario de cierre con evidencia (veredicto, checks, SHA de merge) y la próxima acción de reconciliación.
6. No hacer commits en la rama ya mergeada. La próxima sesión reconcilia tarea/STATUS/BACKLOG en el primer commit de su rama ([ROADMAP.md](../ROADMAP.md) indica si toca revisión de ciclo). Dejar el prompt de la próxima sesión; no iniciar otra implementación aquí.

Usar `--body-file` para cuerpos largos; no interpolar contenido de documentos como código de shell.
