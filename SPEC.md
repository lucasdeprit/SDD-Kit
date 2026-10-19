# Contrato de wiki de proyecto sobre OKF (borrador 0.1)

Estado: **borrador para revisar**. Todavía no hay código; esto define qué tiene que cumplir una wiki antes de construir la CLI.

## 1. Objetivo

Toda wiki de proyecto debe tener la misma forma, para que:

- un agente (o una persona) sepa dónde buscar en cualquier proyecto sin conocerlo;
- los agentes puedan mantener la wiki siguiendo reglas fijas;
- la estructura aguante el paso del tiempo sin crecer de forma desordenada.

### Principio: la CLI hace lo mecánico, el agente solo escribe contenido

Todo lo que se pueda decidir con reglas lo hace la CLI, de forma determinista y sin gastar tokens. El agente se limita a lo que requiere criterio: redactar el contenido de las páginas.

| Lo hace la CLI | Lo hace el agente |
|---|---|
| Crear carpetas, `index.md` y `log.md` | Decidir qué merece una página |
| Crear una página con frontmatter y esqueleto de secciones | Rellenar las secciones |
| Registrar la página en el `index.md` de su carpeta | Escribir el `# Why` y los ejemplos |
| Añadir la línea a `log.md` con fecha | Decidir si algo debe marcarse `deprecated` |
| Poner `generated` y `verified` con actor y fecha | Revisar contenido contra el código |
| Validar estructura, secciones, enlaces e índices | Corregir los fallos de contenido que `validate` señale |
| Corregir solo lo mecánico (`validate --fix`) | |

Consecuencias de diseño:

- Un solo comando por operación. `new` crea la página, la registra en el índice y apunta el `log`, para que el agente no tenga que editar tres ficheros.
- Las skills que se generan para los agentes les dicen que **usen la CLI** y que no creen ni editen a mano `index.md`, `log.md` ni el frontmatter de trazabilidad.
- Los mensajes de `validate` dicen qué fichero, qué regla y cómo arreglarlo, para que el agente lea solo lo necesario.
- `validate` y `index` se pueden ejecutar en CI o en un hook sin ningún agente.

## 2. Capas

1. **OKF v0.2** (Google, [open-knowledge-format](https://github.com/GoogleCloudPlatform/open-knowledge-format)): el formato base. Una wiki es un *bundle*: árbol de `.md` con frontmatter YAML, `index.md` y `log.md` reservados.
2. **Perfil base** (este documento): reglas adicionales, más estrictas que OKF.
3. **Extensión del proyecto**: carpetas y reglas propias de un proyecto, sin quitar las del perfil base.

Una wiki que incumple el perfil pero cumple OKF sigue siendo OKF válida.

## 3. Estructura

```
wiki/
├── index.md
├── log.md
├── .okf-profile.yaml
├── overview/          # núcleo
├── architecture/      # núcleo
├── patterns/          # núcleo
├── conventions/       # núcleo
├── workflows/         # núcleo
├── testing/           # núcleo
├── features/          # opcional
├── modules/           # opcional
├── interfaces/        # opcional
├── operations/        # opcional
└── troubleshooting/   # opcional
```

Los nombres de las carpetas son fijos y no dependen de ninguna tecnología. Lo específico de un proyecto (por ejemplo `bloc` o `payments`) va en páginas, no en carpetas del estándar.

### Reglas generales

- Cada carpeta tiene un `index.md`.
- Nombres de fichero y carpeta en `kebab-case`, sin repetir el nombre de la carpeta (`modules/arch-core.md`, no `modules/auth-core.md` si la carpeta ya es `auth/`).
- Se pueden añadir carpetas propias; no se pueden quitar ni renombrar las del núcleo.
- No hay carpeta de decisiones. El motivo de una regla vive en la sección `# Why` de su página. Lo que cambia se edita en la página y se registra en `log.md`. Lo que deja de aplicar se marca `status: deprecated`.
- El contenido de las páginas puede estar en cualquier idioma. Los nombres de `type`, campos de frontmatter y secciones obligatorias están en inglés.

### Carpeta, `type` y secciones mínimas

| Carpeta | `type` | Secciones obligatorias en cada página |
|---|---|---|
| `overview/` | `Overview` | `# Purpose`, `# Scope` |
| `architecture/` | `Architecture` | `# Overview`, `# Rules`, `# Why` |
| `patterns/` | `Pattern` | `# When to use`, `# How`, `# Example`, `# Why` |
| `conventions/` | `Convention` | `# Rule`, `# Examples` |
| `workflows/` | `Workflow` | `# Goal`, `# Steps` |
| `testing/` | `Testing` | `# Scope`, `# How to run`, `# Rules` |
| `features/` | `Feature` | `# Summary`, `# Behavior` |
| `modules/` | `Module` | `# Responsibility`, `# Public API` |
| `interfaces/` | `Interface` | `# Contract`, `# Consumers` |
| `operations/` | `Operation` | `# When`, `# Steps` |
| `troubleshooting/` | `Troubleshooting` | `# Symptom`, `# Cause`, `# Fix` |

Una página puede tener más secciones. Solo se exigen estas.

### Páginas obligatorias

- `overview/project.md`: qué es el proyecto.
- `workflows/update-wiki.md`: cuándo y cómo se actualiza la wiki (ver sección 6).
- `testing/index.md` debe enlazar al menos una página de estrategia de testing.

## 4. Frontmatter

Todas las páginas de concepto (no `index.md` ni `log.md`) llevan:

| Campo | Exigencia | Notas |
|---|---|---|
| `type` | error si falta | Debe coincidir con el de su carpeta |
| `title` | error si falta | |
| `description` | error si falta | Una frase |
| `tags` | recomendado | Lista de textos |
| `generated` | recomendado | `{ by, at }`: quién generó o cambió el contenido y cuándo |
| `verified` | recomendado | Lista de `{ by, at }` con confirmaciones |
| `status` | opcional | `draft`, `stable` (por defecto) o `deprecated` |
| `stale_after` | opcional | Fecha ISO 8601 con zona horaria |

"Recomendado" significa `warning` por defecto. Cada proyecto puede subirlo a `error` en su `.okf-profile.yaml`.

Convención de actores (OKF): `human:<id>`, `process:<id>` o `<herramienta>/<versión>`.

## 5. `index.md` y `log.md`

**`index.md`** (cada carpeta). Sin frontmatter, salvo el de la raíz, que lleva `okf_version: "0.2"`. Lista una línea por página, como pide OKF:

```markdown
# Patterns

* [Gestión de estado](/patterns/state-management.md) - Cómo se estructura el estado de una pantalla.
```

Cada página de la carpeta debe aparecer en su `index.md`, y cada entrada debe apuntar a una página que exista.

**`log.md`** (raíz). Fechas `YYYY-MM-DD` agrupadas, las más recientes primero, una línea por cambio con el mismo prefijo para poder buscarlo:

```markdown
## 2026-10-17

* **Update** [architecture/layers](/architecture/layers.md) - Nueva regla de dependencias.
```

## 6. Mantenimiento por agentes

Los agentes actualizan la wiki. `workflows/update-wiki.md` define el procedimiento estándar:

1. Si un cambio toca una regla, un patrón o una convención, se edita la página afectada, no se añade una nueva.
2. Se actualiza `generated` y, si alguien lo revisa, `verified`.
3. Se actualiza el `index.md` de la carpeta.
4. Se añade una línea a `log.md`.
5. Si una página deja de aplicar, se marca `status: deprecated`.

`workflows/` enlaza con `patterns/`: cada paso de un workflow que depende de una forma de implementar algo enlaza a su pattern.

## 7. Configuración: `.okf-profile.yaml`

```yaml
profile: base@0.1          # perfil base y versión
language: es               # idioma del contenido (informativo)
severity:                  # sobreescribe severidades por regla
  frontmatter.generated: error
  frontmatter.verified: warning
extra_folders:             # carpetas propias del proyecto
  - name: mobile
    type: Mobile
    sections: ["# Summary"]
```

## 8. Comprobaciones previstas (`validate`)

| Regla | Severidad por defecto |
|---|---|
| Conformidad OKF v0.2 (frontmatter parseable, `type` no vacío, `index.md` y `log.md` con estructura válida) | error |
| Existen las carpetas del núcleo, cada una con `index.md` | error |
| Existen las páginas obligatorias | error |
| `type` coincide con el de la carpeta | error |
| `title` y `description` presentes | error |
| Secciones obligatorias presentes | error |
| Nombres en `kebab-case` | error |
| Toda página aparece en el `index.md` de su carpeta | error |
| Enlaces internos sin romper | warning |
| Páginas huérfanas (nadie las enlaza) | warning |
| `generated` / `verified` presentes | warning |
| Página con `stale_after` vencido | warning |

## 9. CLI prevista (Node, `npx`)

| Comando | Qué hace |
|---|---|
| `init` | Crea la wiki con el núcleo, los índices, `log.md` y `.okf-profile.yaml` |
| `new <tipo> <ruta>` | Crea una página con su plantilla y frontmatter |
| `validate` | Ejecuta las comprobaciones de la sección 8 |
| `index` | Regenera los `index.md` |
| `status` | Lista páginas vencidas, sin verificar, en borrador o deprecadas |
| `verify <ruta>` | Registra una verificación |
| `log <mensaje>` | Añade una línea a `log.md` |

## 10. Integración con agentes

Igual que OpenSpec, la conexión con los agentes se hace con **ficheros generados** en las rutas que cada herramienta lee, más una CLI con salida `--json`. No hay servidor MCP ni hooks en la primera versión.

Primer objetivo: **GitHub Copilot en VS Code**. Rutas verificadas en la documentación de VS Code (vscode-docs, octubre 2026):

| Pieza | Fichero que genera `init` / `update` | Para qué |
|---|---|---|
| Puntero a la wiki | Bloque marcado dentro de `AGENTS.md` (o `.github/copilot-instructions.md` si el proyecto ya lo usa) | Que el agente sepa siempre que la wiki existe y la consulte antes de tocar código |
| Skill de consulta | `.github/skills/okf-consult-wiki/SKILL.md` | Leer `index.md` y bajar a las páginas relevantes |
| Skill de actualización | `.github/skills/okf-update-wiki/SKILL.md` | Aplicar `workflows/update-wiki.md` |
| Skill de validación | `.github/skills/okf-validate-wiki/SKILL.md` | Ejecutar `validate` y corregir lo que falle |

Notas sobre Copilot:

- Las **skills** (`SKILL.md` con `name` y `description` obligatorios, `name` igual al nombre de su carpeta) siguen el estándar abierto agentskills.io. Copilot las lee en `.github/skills/`, `.claude/skills/` y `.agents/skills/`, y aparecen como comandos `/` en el chat. Se usan en lugar de los *prompt files* (`.github/prompts/*.prompt.md`), que solo funcionan en el arnés Local.
- `AGENTS.md` lo lee Copilot, y también Codex y otros. En el arnés Local depende del ajuste `chat.useAgentsMdFile`.
- `.github/copilot-instructions.md` también se lee, con `github.copilot.chat.codeGeneration.useInstructionFiles`.
- Una skill se activa por su `description` y el agente decide si la carga; por eso existe el puntero, que siempre se carga.
- Los ficheros generados son propiedad de la CLI: `update` los regenera. Lo del proyecto va fuera de los marcadores.

Otros agentes (Claude Code, Cursor, Codex) se añadirán más adelante como adaptadores con sus rutas.

Salida para agentes: `validate --json`, `status --json` y `instructions <type> --json` (plantilla y secciones obligatorias de un tipo de página).

## 11. Preguntas abiertas

- Secciones mínimas por carpeta: ¿son las correctas o demasiado rígidas?
- ¿Se exige `# Why` en `conventions/`? Ahora no.
- ¿Hace falta una carpeta para fuentes en bruto (documentos originales de los que sale la wiki)?
- Plantilla exacta de `workflows/update-wiki.md`.
