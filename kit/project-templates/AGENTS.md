## Flujo de trabajo con IA (sdd-kit)

Este proyecto usa desarrollo guiado por specs con OpenSpec (schema `sdd-kit`).

- **Conocimiento del proyecto**: `{{WIKI_PATH}}/index.md`. Léelo antes de cualquier tarea no trivial (skill `consultar-wiki`).
- **Cambios**: todo cambio funcional pasa por OpenSpec: propuesta → specs → diseño → tareas → implementación → revisión → archivo.
- **Agentes**: `sdd-analista`, `sdd-arquitecto`, `sdd-implementador`, `sdd-revisor`.
- **Stack**: {{STACKS}} (skills `stack-*`). Si una skill y la wiki se contradicen, manda la wiki.
- **No edites** los ficheros que gestiona el kit (`openspec/schemas/sdd-kit/`, agentes y skills generados): cámbialos en el repo del kit y ejecuta `python3 {{KIT_PATH}}/scripts/sync.py`.
