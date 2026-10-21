import { loadProfile } from '../profile.js';
import { loadWiki } from '../pages.js';
import { countTodos, trustState } from '../trust.js';
import { UserError } from '../errors.js';

const FILTERS = ['unverified', 'outdated', 'deprecated', 'todo'];

export const statusHelp = `okw status [--only ${FILTERS.join('|')}]

Summarises the review state of the wiki: pages by trust tier and the pages that
need attention. Informational: it always exits with code 0.
  --only  list only the pages with that flag
          unverified  nobody has reviewed the page
          outdated    the page changed after it was verified
          deprecated  status: deprecated
          todo        unfilled TODO placeholders
Deprecated pages are not asked to be reviewed.`;

export function statusCommand({ root, only }) {
  const profile = loadProfile(root);
  if (only !== undefined && !FILTERS.includes(only)) {
    throw new UserError(`Unknown filter "${only}". Use one of: ${FILTERS.join(', ')}.`);
  }
  const knownFolders = new Set(profile.folders.map((f) => f.name));

  const pages = loadWiki(root)
    .concepts.filter((c) => c.data && c.folder && knownFolders.has(c.folder))
    .map((c) => {
      const deprecated = c.data.status === 'deprecated';
      const { tier, outdated } = trustState(c.data, c.body);
      const todos = countTodos(c.body);
      const flags = [
        !deprecated && outdated && 'outdated',
        !deprecated && !outdated && tier === 'unverified' && 'unverified',
        deprecated && 'deprecated',
        todos && 'todo',
      ].filter(Boolean);
      return { path: c.rel, deprecated, tier, outdated, todos, flags };
    });

  const active = pages.filter((p) => !p.deprecated);
  const by_trust = {
    'human-reviewed': active.filter((p) => p.tier === 'human-reviewed').length,
    'machine-confirmed': active.filter((p) => p.tier === 'machine-confirmed').length,
    unverified: active.filter((p) => p.tier === 'unverified' && !p.outdated).length,
    outdated: active.filter((p) => p.outdated).length,
  };
  const deprecated = pages.length - active.length;
  const attention = pages.filter((p) => (only ? p.flags.includes(only) : p.flags.length > 0));

  const lines = [
    `${pages.length} page${pages.length === 1 ? '' : 's'} (${deprecated} deprecated)`,
    `Review: ${Object.entries(by_trust).map(([k, v]) => `${v} ${k}`).join(', ')}`,
  ];
  if (attention.length) {
    lines.push('', only ? `Pages flagged "${only}":` : 'Pages that need attention:');
    const width = Math.max(...attention.map((p) => p.path.length));
    for (const p of attention) {
      const shown = only ? [only] : p.flags;
      const detail = shown.map((f) => (f === 'todo' ? `${p.todos} TODO` : f));
      lines.push(`  ${p.path.padEnd(width)}  ${detail.join(', ')}`);
    }
  } else {
    lines.push('', only ? `No pages flagged "${only}".` : 'Nothing needs attention.');
  }

  return {
    total: pages.length,
    deprecated,
    by_trust,
    pages: attention.map(({ path, tier, outdated, todos, flags }) => ({ path, tier, outdated, todos, flags })),
    text: lines.join('\n'),
  };
}
