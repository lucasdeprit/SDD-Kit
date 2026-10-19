# Project wiki contract on top of OKF (draft 0.1)

Status: **draft under review**. This defines what a wiki must satisfy; the `okw` CLI implements and enforces it.

## 1. Goal

Every project wiki must have the same shape, so that:

- an agent (or a person) knows where to look in any project without knowing it beforehand;
- agents can maintain the wiki by following fixed rules;
- the structure lasts over time without growing in a disorderly way.

### Principle: the CLI does the mechanical work, the agent only writes content

Anything that can be decided with rules is done by the CLI, deterministically and without spending tokens. The agent is limited to what requires judgement: writing the content of the pages.

| The CLI does | The agent does |
|---|---|
| Create folders, `index.md` and `log.md` | Decide what deserves a page |
| Create a page with frontmatter and a section skeleton | Fill in the sections |
| Register the page in the `index.md` of its folder | Write the `# Why` and the examples |
| Append the dated line to `log.md` | Decide whether something should be marked `deprecated` |
| Set `generated` and `verified` with actor and date | Review content against the code |
| Validate structure, sections, links and indexes | Fix the content problems that `validate` reports |
| Fix only the mechanical issues (`validate --fix`) | |

Design consequences:

- One command per operation. `new` creates the page, registers it in the index and records the `log` entry, so the agent does not have to edit three files.
- The skills generated for agents tell them to **use the CLI** and not to create or hand-edit `index.md`, `log.md` or the traceability frontmatter.
- `validate` messages say which file, which rule and how to fix it, so the agent reads only what it needs.
- `validate` and `index` can run in CI or in a hook without any agent.

## 2. Layers

1. **OKF v0.2** (Google, [open-knowledge-format](https://github.com/GoogleCloudPlatform/open-knowledge-format)): the base format. A wiki is a *bundle*: a tree of `.md` files with YAML frontmatter and reserved `index.md` and `log.md`.
2. **Base profile** (this document): additional rules, stricter than OKF.
3. **Project extension**: folders and rules specific to a project, without removing those of the base profile.

A wiki that breaks the profile but satisfies OKF is still valid OKF.

## 3. Structure

```
wiki/
├── index.md
├── log.md
├── .okf-profile.yaml
├── overview/          # core
├── architecture/      # core
├── patterns/          # core
├── conventions/       # core
├── workflows/         # core
├── testing/           # core
├── features/          # optional
├── modules/           # optional
├── interfaces/        # optional
├── operations/        # optional
└── troubleshooting/   # optional
```

Folder names are fixed and do not depend on any technology. Whatever is specific to a project (for example `bloc` or `payments`) goes in pages, not in folders of the standard.

### General rules

- Every folder has an `index.md`.
- File and folder names in `kebab-case`, without repeating the folder name (`modules/arch-core.md`, not `modules/auth-core.md` if the folder is already `auth/`).
- Own folders can be added (declared in `extra_folders`); core folders cannot be removed or renamed.
- There is no decisions folder. The reason for a rule lives in the `# Why` section of its page. What changes is edited in the page and recorded in `log.md`. What stops applying is marked `status: deprecated`.
- Page content can be in any language. The `type` names, frontmatter fields and required section names are in English.

### Folder, `type` and minimum sections

| Folder | `type` | Sections required in every page |
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

A page may have more sections. Only these are required.

### Required pages

- `overview/project.md`: what the project is.
- `workflows/update-wiki.md`: when and how the wiki is updated (see section 6).
- `testing/` must contain at least one testing strategy page (so `testing/index.md` links to it).

## 4. Frontmatter

Every concept page (not `index.md` or `log.md`) carries:

| Field | Requirement | Notes |
|---|---|---|
| `type` | error if missing | Must match the type of its folder |
| `title` | error if missing | |
| `description` | error if missing | One sentence |
| `tags` | recommended | List of strings |
| `generated` | recommended | `{ by, at }`: who produced or changed the content and when |
| `verified` | recommended | List of `{ by, at }` confirmations |
| `status` | optional | `draft`, `stable` (default) or `deprecated` |
| `stale_after` | optional | ISO 8601 date |

"Recommended" means `warning` by default. Each project can raise it to `error` in its `.okf-profile.yaml`.

Actor convention (OKF): `human:<id>`, `process:<id>` or `<tool>/<version>`.

## 5. `index.md` and `log.md`

**`index.md`** (every folder). No frontmatter, except the root one, which carries `okf_version: "0.2"`. One line per page, as OKF asks:

```markdown
# Patterns

* [State management](/patterns/state-management.md) - How the state of a screen is structured.
```

Indexes are generated by `okw index` and are never edited by hand. Every page of the folder must appear in its `index.md`, and every entry must point to a page that exists.

**`log.md`** (root). `YYYY-MM-DD` dates grouped, most recent first, one line per change with the same prefix so it can be searched:

```markdown
## 2026-10-17

* **Update** [architecture/layers](/architecture/layers.md) - New dependency rule.
```

## 6. Maintenance by agents

Agents update the wiki. `workflows/update-wiki.md` defines the standard procedure:

1. If a change affects a rule, a pattern or a convention, the affected page is edited; a new one is not added.
2. `generated` is updated and, if someone reviews it, `verified`.
3. The `index.md` of the folder is updated.
4. A line is added to `log.md`.
5. If a page stops applying, it is marked `status: deprecated`.

`workflows/` links to `patterns/`: every workflow step that depends on a way of implementing something links to its pattern.

## 7. Configuration: `.okf-profile.yaml`

```yaml
profile: base@0.1          # base profile and version
language: en               # language of the content (informational)
severity:                  # overrides the severity of a rule: error | warning | off
  frontmatter.generated: error
  frontmatter.verified: warning
extra_folders:             # project-specific folders
  - name: mobile
    type: Mobile
    sections: ["# Summary"]
```

## 8. Checks (`validate`)

Every rule has a stable id that can be used in `severity`.

| Rule id | Check | Default severity | Fixed by `--fix` |
|---|---|---|---|
| `okf.frontmatter` | Concept pages have parseable YAML frontmatter | error | |
| `okf.type` | `type` is present and non-empty | error | |
| `okf.index` | `index.md` has no frontmatter (the root one only `okf_version`) | error | |
| `okf.log` | Date headings in `log.md` are `YYYY-MM-DD` | error | |
| `structure.core-folder` | Every core folder exists | error | yes |
| `structure.required-page` | Required pages exist | error | yes |
| `structure.testing-page` | `testing/` has at least one strategy page | error | |
| `structure.unknown-folder` | Pages live in a core, optional or declared folder | warning | |
| `page.type` | `type` matches the type of the folder | error | |
| `page.sections` | Required sections are present | error | yes |
| `page.todo` | No unfilled `<!-- TODO -->` placeholders | warning | |
| `frontmatter.title` | `title` present | error | |
| `frontmatter.description` | `description` present | error | |
| `frontmatter.status` | `status` is `draft`, `stable` or `deprecated` | error | |
| `frontmatter.generated` | `generated` present, with `by` | warning | |
| `frontmatter.verified` | `verified` present | warning | |
| `frontmatter.stale` | `stale_after` is a valid date and not yet reached | warning | |
| `name.kebab-case` | File and folder names are `kebab-case` | error | |
| `index.stale` | Every `index.md` is up to date (missing pages, dead entries, missing indexes) | error | yes |
| `link.broken` | Internal links point to existing pages | warning | |
| `page.orphan` | Some other concept page links to it | warning | |

`validate` exits with code 1 if there is any error (`--strict`: any warning too). `--json` prints every issue with `rule`, `severity`, `file`, `message` and `fix`.

## 9. CLI (Node, `npx`)

| Command | What it does |
|---|---|
| `init` | Creates the wiki with the core, the indexes, `log.md` and `.okf-profile.yaml` |
| `new <type> <name>` | Creates a page with its template and frontmatter, indexes it and logs it |
| `validate` | Runs the checks of section 8; `--fix` repairs the mechanical ones |
| `index` | Regenerates the `index.md` files |
| `status` | Lists stale, unverified, draft or deprecated pages |
| `verify <path>` | Records a verification |
| `log <message>` | Appends a line to `log.md` |

## 10. Agent integration

As OpenSpec does, the connection with agents is made with **generated files** in the paths each tool reads, plus a CLI with `--json` output. There is no MCP server and no hooks in the first version.

First target: **GitHub Copilot in VS Code**. Paths verified in the VS Code documentation (vscode-docs, October 2026):

| Piece | File generated by `init` / `update` | Purpose |
|---|---|---|
| Pointer to the wiki | Marked block inside `AGENTS.md` (or `.github/copilot-instructions.md` if the project already uses it) | So the agent always knows the wiki exists and consults it before touching code |
| Consult skill | `.github/skills/okf-consult-wiki/SKILL.md` | Read `index.md` and drill into the relevant pages |
| Update skill | `.github/skills/okf-update-wiki/SKILL.md` | Apply `workflows/update-wiki.md` |
| Validation skill | `.github/skills/okf-validate-wiki/SKILL.md` | Run `validate` and fix what fails |

Notes on Copilot:

- **Skills** (`SKILL.md` with required `name` and `description`, `name` equal to the folder name) follow the open standard agentskills.io. Copilot reads them in `.github/skills/`, `.claude/skills/` and `.agents/skills/`, and they show up as `/` commands in chat. They are used instead of *prompt files* (`.github/prompts/*.prompt.md`), which only work in the Local harness.
- `AGENTS.md` is read by Copilot, and also by Codex and others. In the Local harness it depends on the `chat.useAgentsMdFile` setting.
- `.github/copilot-instructions.md` is also read, with `github.copilot.chat.codeGeneration.useInstructionFiles`.
- A skill is activated by its `description` and the agent decides whether to load it; that is why the pointer exists, since it is always loaded.
- Generated files belong to the CLI: `update` regenerates them. Project content goes outside the markers.

Other agents (Claude Code, Cursor, Codex) will be added later as adapters with their paths.

Output for agents: `validate --json`, `status --json` and `instructions <type> --json` (template and required sections of a page type).

## 11. Open questions

- Minimum sections per folder: are they the right ones or too rigid?
- Is `# Why` required in `conventions/`? Currently not.
- Is a folder needed for raw sources (original documents the wiki is derived from)?
- Exact template of `workflows/update-wiki.md`.
