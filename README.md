# okw

Scaffolding and management of project wikis in [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/open-knowledge-format).

The CLI does the mechanical work (structure, indexes, frontmatter, validation) so that agents only write content. The contract it enforces is described in [SPEC.md](SPEC.md).

## Status

Work in progress. Available: `init`, `new`, `validate`, `verify`. `init` also generates the files that connect the wiki to GitHub Copilot (see below).

## Install

`okw` is installed from the private Git repository, so you need Node 20 or later and read access to the repo (your usual Git credentials: SSH key or `gh auth login`). Pin a version with a tag.

```bash
# Run without installing
npx github:lucasdeprit/SDD-Kit#v0.1.0 init docs/wiki

# Or install it globally and use the `okw` command
npm install -g github:lucasdeprit/SDD-Kit#v0.1.0
okw init docs/wiki
```

To upgrade, install the new tag. Then run `okw init` again in each project to refresh the generated agent files.

The generated skills call `okw`, so a global install is what lets agents run it.

## Usage

```bash
okw init docs/wiki --with features,modules
okw new pattern state-management --description "How screen state is structured."
okw validate --fix
okw verify patterns/state-management --by human:ana
```

`init` writes, relative to the directory where you run it, a pointer block in `AGENTS.md` (or `.github/copilot-instructions.md`) and three skills in `.github/skills/` (`okf-consult-wiki`, `okf-update-wiki`, `okf-review-wiki`). Run `init` again to refresh them after upgrading; it never touches the wiki pages. `--no-agents` skips them.

Every command accepts `--json` and `--wiki <folder>`. Requires Node 20 or later.

## Development

```bash
npm install
npm test
node bin/okw.js --help   # run from a clone
```
