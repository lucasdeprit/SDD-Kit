import { loadProfile } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';

export const indexHelp = `okw index [--check]

Regenerates every index.md from the pages. With --check nothing is written:
exits with code 1 if any index is out of date (useful in CI).`;

export function indexCommand({ root, check = false }) {
  const profile = loadProfile(root);
  const changed = regenerateIndexes(root, profile, { check });
  const text = changed.length
    ? `${check ? 'Out of date' : 'Updated'}: ${changed.join(', ')}`
    : 'Indexes are up to date.';
  return { changed, ok: !(check && changed.length), text };
}
