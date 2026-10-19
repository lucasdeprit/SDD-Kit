# okw

Scaffolding y gestión de wikis de proyecto en [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/open-knowledge-format).

La CLI hace lo mecánico (estructura, índices, log, frontmatter, validación) para que los agentes solo escriban contenido. El contrato que define está en [SPEC.md](SPEC.md).

## Estado

En construcción. Disponible: `init`, `new`, `index`, `log`. Pendiente: `validate`, `verify`, `status`, y la generación de skills para agentes (Copilot).

## Uso

```bash
node bin/okw.js init docs/wiki --with features,modules
node bin/okw.js new pattern state-management --description "Cómo se estructura el estado."
node bin/okw.js log "Nueva regla de capas" --page architecture/layers.md
node bin/okw.js index --check
```

Todos los comandos aceptan `--json` y `--wiki <carpeta>`. Requiere Node 20 o superior.

## Desarrollo

```bash
npm install
npm test
```
