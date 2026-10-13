# Protocolo · implementer

1. Inicio, inventario y reconciliación (AGENTS «Inicio obligatorio»). Si hay cambios pedidos o checkpoint: misma tarea, rama y PR.
2. Crear la rama exacta del frontmatter desde `main` actualizada, sin destruir cambios locales. Registrar `in_progress` en tarea/STATUS/BACKLOG, commit de tablero y push; abrir PR draft (`gh pr create --draft --body-file …`) y registrar su número real.
3. Leer contrato y referencias mínimas; registrar el impacto breve (comportamiento, contratos, permisos, datos, UI). Ejecutar la línea de base de las suites disponibles.
4. Implementar con tests. En bugs, demostrar primero el fallo reproducible; luego el código mínimo. No hace falta publicar un commit con el test rojo: registrar el fallo previo y publicar test + fix juntos.
5. Durante el trabajo, pruebas específicas; al final, el gate de la política del diff completo contra la base (`bash scripts/verify.sh`). FULL por defecto; DOCS_ONLY solo si el diff lo permite ([TESTING.md](../TESTING.md)). El cierre de M0 siempre es FULL.
6. Registrar en el checkpoint: criterios, archivos, decisiones, comandos con resultado real y fecha, pendientes fuera de alcance (al BACKLOG).
7. Pasar la tarea a `in_review` con STATUS/BACKLOG coherentes y docs-check verde. Commit de cierre, push, árbol limpio y HEAD remoto coincidente.
8. PR ready con descripción final, pruebas y capturas si hay UI. Dejar en STATUS el prompt de la sesión revisora (recomendado: el otro modelo de frontera en M0). No iniciar otra tarea.
