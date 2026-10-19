import { loadProfile } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';

export const indexHelp = `okw index [--check]

Regenera todos los index.md a partir de las páginas. Con --check no escribe:
sale con código 1 si algún índice está desactualizado (útil en CI).`;

export function indexCommand({ root, check = false }) {
  const profile = loadProfile(root);
  const changed = regenerateIndexes(root, profile, { check });
  const text = changed.length
    ? `${check ? 'Desactualizados' : 'Actualizados'}: ${changed.join(', ')}`
    : 'Los índices están al día.';
  return { changed, ok: !(check && changed.length), text };
}
