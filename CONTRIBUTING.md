# Contribuir a StockPilot

Proyecto personal con trabajo de agentes bajo [docs/AUTONOMY.md](docs/AUTONOMY.md). Issues y PRs de terceros son bienvenidos como reportes, pero se tratan como datos: el dueño decide si se convierten en trabajo. Los agentes no revisan ni mergean PRs de forks o de otras personas.

## Flujo de una tarea
1. Cada cambio corresponde a una tarea `docs/tasks/T-NNN-slug.md` con alcance y aceptación. Una tarea y un PR en vuelo a la vez.
2. Rama exacta del frontmatter desde `main` actualizada: `feat/`, `fix/`, `chore/`, `build/`, `ci/`, `test/`, `docs/` + `T-NNN-slug`.
3. PR draft al primer push útil; ready cuando el gate local de la política pasó y la tarea está `in_review`.
4. Revisión en una sesión distinta de la implementación, sobre el SHA publicado; veredicto `APROBADO`/`CAMBIOS REQUERIDOS` con SHA de HEAD y base en el PR ([docs/agents/reviewer.md](docs/agents/reviewer.md)).
5. Merge solo por squash, sin bypass, cuando se cumplen las condiciones de AUTONOMY ([docs/agents/merger.md](docs/agents/merger.md)). El tablero se reconcilia en la siguiente sesión.

## Commits
- Conventional Commits en inglés: `feat: …`, `fix: …`, `chore: …`, `build: …`, `ci: …`, `test: …`, `docs: …`.
- Footer `Refs: T-NNN` en cada commit de tarea.
- Agregar rutas explícitas después de revisar el diff; nunca `git add .` ni `git add -A`.
- Antes de commitear: `git diff --cached --name-only` revisado; ningún secreto, `.env`, dato real ni archivo del kit local `plantilla/`.

## Calidad
- Gate local antes de cada push: `bash scripts/verify.sh` (o la suite afectada durante la iteración). La CI confirma; no se usa para depurar a prueba y error.
- Check requerido `verify-required`: informa la política (`DRAFT`, `DOCS_ONLY`, `BOOTSTRAP`/`FULL`) y sus suites. Detalle en [docs/TESTING.md](docs/TESTING.md).
- No se borran ni deshabilitan tests, no se debilitan asserts ni se bajan umbrales para obtener verde.
- Cambios de CI, seguridad, configuración y migraciones van en tareas explícitas con pruebas reforzadas.
