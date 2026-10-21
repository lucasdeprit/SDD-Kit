# okw

Scaffolding and management of project wikis in [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/open-knowledge-format).

The CLI does the mechanical work (structure, indexes, frontmatter, validation) so that agents only write content. The contract it enforces is described in [SPEC.md](SPEC.md).

## Status

Work in progress. Available: `init`, `new`, `validate`, `verify`. `init` also generates the files that connect the wiki to GitHub Copilot (see below).

## Usage

```bash
node bin/okw.js init docs/wiki --with features,modules
node bin/okw.js new pattern state-management --description "How screen state is structured."
node bin/okw.js validate --fix
node bin/okw.js verify patterns/state-management --by human:ana
```

`init` writes, relative to the directory where you run it, a pointer block in `AGENTS.md` (or `.github/copilot-instructions.md`) and three skills in `.github/skills/` (`okf-consult-wiki`, `okf-update-wiki`, `okf-review-wiki`). Run `init` again to refresh them after upgrading; it never touches the wiki pages. `--no-agents` skips them.

Every command accepts `--json` and `--wiki <folder>`. Requires Node 20 or later.

## Development

```bash
npm install
npm test
```
