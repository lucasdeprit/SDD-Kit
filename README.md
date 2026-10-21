# okw

Scaffolding and management of project wikis in [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/open-knowledge-format).

The CLI does the mechanical work (structure, indexes, frontmatter, validation) so that agents only write content. The contract it enforces is described in [SPEC.md](SPEC.md).

## Status

Work in progress. Available: `init`, `new`, `index`, `validate`, `verify`, `status`. Pending: generating skills for agents (Copilot).

## Usage

```bash
node bin/okw.js init docs/wiki --with features,modules
node bin/okw.js new pattern state-management --description "How screen state is structured."
node bin/okw.js index --check
node bin/okw.js validate --fix
node bin/okw.js verify patterns/state-management --by human:ana
node bin/okw.js status
```

Every command accepts `--json` and `--wiki <folder>`. Requires Node 20 or later.

## Development

```bash
npm install
npm test
```
