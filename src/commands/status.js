import { loadProfile } from '../profile.js';
import { loadWiki } from '../pages.js';
import { countTodos, staleSince, trustTier } from '../trust.js';
import { UserError } from '../errors.js';

const FILTERS = ['stale', 'unverified', 'draft', 'deprecated', 'todo'];

export const statusHelp = `okw status [--only ${FILTERS.join('|')}]

Summarises the state of the wiki: pages by status and trust tier, and the pages
that need attention. Informational: it always exits with code 0.
  --only  list only the pages with that flag
          stale       stale_after has been reached
          unverified  no "verified" entry
          draft       status: draft
          deprecated  status: deprecated
          todo        unfilled TODO placeholders`;

export function statusCommand({ root, only, now = new Date() }) {
  const profile = loadProfile(root);
  if (only !== undefined && !FILTERS.includes(only)) {
    throw new UserError(`Unknown filter "${only}". Use one of: ${FILTERS.join(', ')}.`);
  }
  const wiki = loadWiki(root);
  const knownFolders = new Set(profile.folders.map((f) => f.name));

  const pages = wiki.concepts
    .filter((c) => c.data && c.folder && knownFolders.has(c.folder))
    .map((c) => {
      const status = c.data.status ?? 'stable';
      const tier = trustTier(c.data);
      const stale = staleSince(c.data, now);
      const todos = countTodos(c.body);
      const flags = [
        stale && 'stale',
        tier === 'unverified' && 'unverified',
        status === 'draft' && 'draft',
        status === 'deprecated' && 'deprecated',
        todos && 'todo',
      ].filter(Boolean);
      return { path: c.rel, status, tier, stale_since: stale, todos, flags };
    });

  const count = (key, values) => Object.fromEntries(values.map((v) => [v, pages.filter((p) => p[key] === v).length]));
  const byStatus = count('status', ['draft', 'stable', 'deprecated']);
  const byTier = count('tier', ['human-reviewed', 'machine-confirmed', 'unverified']);
  const attention = pages.filter((p) => (only ? p.flags.includes(only) : p.flags.length > 0));

  const lines = [
    `${pages.length} page${pages.length === 1 ? '' : 's'}`,
    `Status: ${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ')}`,
    `Trust:  ${Object.entries(byTier).map(([k, v]) => `${v} ${k}`).join(', ')}`,
  ];
  if (attention.length) {
    lines.push('', only ? `Pages flagged "${only}":` : 'Pages that need attention:');
    const width = Math.max(...attention.map((p) => p.path.length));
    for (const p of attention) {
      const shown = only ? [only] : p.flags;
      const detail = [
        shown.includes('stale') ? `stale since ${p.stale_since}` : null,
        shown.includes('todo') ? `${p.todos} TODO` : null,
        ...shown.filter((f) => f !== 'stale' && f !== 'todo'),
      ].filter(Boolean);
      lines.push(`  ${p.path.padEnd(width)}  ${detail.join(', ')}`);
    }
  } else {
    lines.push('', only ? `No pages flagged "${only}".` : 'Nothing needs attention.');
  }

  return { total: pages.length, by_status: byStatus, by_trust: byTier, pages: attention, text: lines.join('\n') };
}
