# sdd-kit

Kit común para hacer desarrollo guiado por specs (SDD) con agentes de IA en proyectos de tecnologías distintas, sin rehacer el setup en cada uno.

Separa tres cosas:

| Capa | Dónde vive | Quién la mantiene |
|---|---|---|
| **Metodología**: schema de OpenSpec, plantillas, agentes, skills | Este repo | Equipo del kit |
| **Configuración del proyecto**: `ai-kit.yaml`, `openspec/config.yaml` | Cada proyecto | Cada proyecto |
| **Conocimiento del proyecto**: wiki (OKF) | Cada proyecto | Cada proyecto |

Los agentes y skills nunca conocen el proyecto. Solo saben que hay una wiki cuyo `index.md` cumple un **contrato** (`kit/wiki-contract.yaml`): una sección por tema obligatorio con enlaces a sus páginas. Con eso funcionan igual en un proyecto iOS que en uno Java.

## Estructura

```
sdd-kit/
├── VERSION
├── kit/
│   ├── openspec/schemas/sdd-kit/    # schema de OpenSpec + plantillas (proposal, spec, design, tasks)
│   ├── agents/                      # agentes en formato neutro (uno por rol)
│   ├── skills/
│   │   ├── core/                    # siempre se instalan (consultar-wiki, actualizar-wiki)
│   │   └── stacks/                  # por tecnología (ios, android, _plantilla)
│   ├── wiki-contract.yaml           # secciones obligatorias del index de la wiki
│   └── project-templates/           # semillas: ai-kit.yaml, config.yaml, AGENTS.md, wiki
├── scripts/
│   ├── sync.py                      # instala/actualiza el kit en un proyecto
│   └── check_wiki.py                # valida la wiki contra el contrato
├── tests/
└── .github/workflows/
    ├── ci.yml                       # CI del kit (tests + validación del schema con OpenSpec)
    └── project-check.yml            # workflow reutilizable para los proyectos
```

## Poner el repo en marcha

```bash
git init -b main && git add . && git commit -m "sdd-kit 0.1.0"
gh repo create <org>/sdd-kit --private --source . --push
git tag v0.1.0 && git push --tags
```

## Añadir el kit a un proyecto

Requisitos: Python 3.9+ con PyYAML (`pip install pyyaml`) y OpenSpec (`npm i -g @fission-ai/openspec`).

```bash
# 1. El kit como submódulo, fijado a una versión
git submodule add git@github.com:<org>/sdd-kit.git .sdd-kit
git -C .sdd-kit checkout v0.1.0

# 2. Manifiesto del proyecto
python3 .sdd-kit/scripts/sync.py --init     # crea ai-kit.yaml → edítalo

# 3. Instalar
python3 .sdd-kit/scripts/sync.py
python3 .sdd-kit/scripts/check_wiki.py

# 4. Instalar los comandos/skills propios de OpenSpec para vuestros harnesses
openspec init
python3 .sdd-kit/scripts/sync.py --check
```

Si `openspec init` deja otro schema en `openspec/config.yaml`, `sync` y `--check` avisan: vuelve a poner `schema: sdd-kit`.

`ai-kit.yaml`:

```yaml
project: App Banca Particulares
wiki: docs/wiki          # si ya tenéis wiki OKF, apunta a ella
stacks: [ios]
harnesses: [copilot, claude]
```

### Qué genera

| Fichero | Tipo | ¿Se puede editar en el proyecto? |
|---|---|---|
| `openspec/schemas/sdd-kit/**` | Gestionado | No: se cambia en el kit |
| `.github/agents/*.agent.md`, `.github/skills/*` (Copilot) | Gestionado | No |
| `.claude/agents/*.md`, `.claude/skills/*` (Claude Code) | Gestionado | No |
| Bloque `sdd-kit` dentro de `AGENTS.md` | Gestionado | El resto de `AGENTS.md`, sí |
| `openspec/config.yaml` | Semilla | Sí: contexto y reglas del proyecto |
| `CLAUDE.md` (`@AGENTS.md`) | Semilla | Sí |
| Wiki (solo si no existe `index.md`) | Semilla | Sí |
| `.sdd-kit.lock.json` | Registro | No: versión del kit y hash de cada fichero gestionado |

Si alguien edita a mano un fichero gestionado, `sync` no lo pisa y avisa (`--force` para sobrescribir). `sync --check` falla en CI en ese caso.

## Flujo de trabajo

1. **`sdd-analista`**: crea el cambio en OpenSpec, escribe `proposal.md` y las specs delta.
2. **`sdd-arquitecto`**: escribe `design.md` y `tasks.md` siguiendo la arquitectura de la wiki.
3. **`sdd-implementador`**: implementa tarea a tarea, con build y tests de la wiki.
4. **`sdd-revisor`**: verifica contra las specs y convenciones, actualiza la wiki si hace falta y archiva.

Cada artefacto lo genera el agente pidiendo a OpenSpec sus instrucciones (`openspec instructions <artefacto> --change <id>`), que combinan el schema común con el `context` y las `rules` del `config.yaml` del proyecto. Así la metodología es la misma en todos los proyectos y lo específico entra por configuración.

## Conectar con vuestra wiki OKF existente

El contrato solo exige que `index.md` tenga estas secciones `##` con al menos un enlace a una página existente:

Scope · Arquitectura · Convenciones · Mapa del código · Cómo añadir una funcionalidad · Comandos · Testing

Admite alias (p. ej. `## Architecture`), definidos en `kit/wiki-contract.yaml`. El resto de la estructura y los metadatos OKF de cada página no se tocan. Si la wiki ya existe, `sync` no crea la semilla; ejecuta `check_wiki.py` para ver qué falta.

## Mantener el kit

- **Cambiar plantillas o el flujo**: edita `kit/openspec/schemas/sdd-kit/`. Valida con `openspec schema validate sdd-kit` dentro de un proyecto sincronizado (la CI del kit ya lo hace).
- **Nuevo stack**: copia `kit/skills/stacks/_plantilla` a `kit/skills/stacks/<tecnologia>/` y cambia el `name` del frontmatter a `stack-<tecnologia>`.
- **Nuevo agente**: añade un `.md` en `kit/agents/`. El bloque `harness:` del frontmatter pasa tal cual al frontmatter de cada harness (p. ej. `tools`, `model`), así que puedes ajustar cada uno sin duplicar el agente.
- **Variables** disponibles en agentes, skills y plantillas: `{{PROJECT_NAME}}`, `{{WIKI_PATH}}`, `{{STACKS}}`, `{{KIT_PATH}}`. Una variable desconocida hace fallar el sync.
- **Publicar versión**: actualiza `VERSION`, etiqueta `vX.Y.Z`. Cada proyecto actualiza a su ritmo:

```bash
git -C .sdd-kit fetch --tags && git -C .sdd-kit checkout v0.2.0
python3 .sdd-kit/scripts/sync.py
git add .sdd-kit . && git commit -m "Actualiza sdd-kit a 0.2.0"
```

## CI en los proyectos

```yaml
# .github/workflows/sdd-kit.yml del proyecto
name: sdd-kit
on: [pull_request]
jobs:
  check:
    uses: <org>/sdd-kit/.github/workflows/project-check.yml@v0.1.0
    secrets: inherit
```

Comprueba que el kit está sincronizado, que la wiki cumple el contrato y que las specs de OpenSpec validan. Como el kit es privado, el proyecto necesita un secreto `SDD_KIT_TOKEN` con lectura sobre este repo para clonar el submódulo, y el repo del kit debe permitir el acceso a sus workflows desde los repos de la organización (Settings → Actions → Access).

## Tests

```bash
python3 -m unittest discover -s tests -v
```
