import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { loadProfile } from '../profile.js';
import { editFrontmatter, parseFrontmatter } from '../frontmatter.js';
import { countTodos, trustTier, verifiedList } from '../trust.js';
import { isoNow, toPosix } from '../util.js';
import { UserError } from '../errors.js';

const STATUSES = ['draft', 'stable', 'deprecated'];
const ACTOR = /^(?:(?:human|process):\S+|[^\s/:]+\/\S+)$/;

export const verifyHelp = `okw verify <path> [--by <actor>] [--status stable] [--stale-after <date>] [--force]

Records that a page has been reviewed: adds { by, at } to "verified" (one entry
per actor; a repeat verification replaces the previous one). The path is
relative to the wiki, with or without ".md".
  --by           actor: human:<id>, process:<id> or <tool>/<version>.
                 Default: $OKW_ACTOR, else okw/<version> (machine-confirmed).
                 Use human:<id> when a person reviewed the page.
  --status       also set the page status (${STATUSES.join(', ')})
  --stale-after  also set stale_after (ISO 8601 date, e.g. 2026-12-31)
  --force        verify even if the page still has unfilled TODO placeholders`;

// Accepts a path relative to the wiki or to the current directory.
function locatePage(root, cwd, arg) {
  const withExt = arg.endsWith('.md') ? arg : `${arg}.md`;
  const candidates = [join(root, withExt)];
  if (!isAbsolute(withExt)) candidates.push(resolve(cwd, withExt));
  for (const file of candidates) {
    const rel = toPosix(relative(root, file));
    if (!rel.startsWith('..') && existsSync(file)) return { file, rel };
  }
  throw new UserError(`Page not found: ${arg}. Use a path relative to the wiki, e.g. patterns/state-management.md.`);
}

export function verifyCommand({ root, cwd, path, by, status, staleAfter, force = false, now = new Date(), version }) {
  loadProfile(root);
  if (!path) throw new UserError('Usage: okw verify <path> [--by <actor>]');
  const actor = by ?? process.env.OKW_ACTOR ?? `okw/${version}`;
  if (!ACTOR.test(actor)) {
    throw new UserError(`Invalid actor "${actor}". Use human:<id>, process:<id> or <tool>/<version>.`);
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new UserError(`Invalid status "${status}". Use one of: ${STATUSES.join(', ')}.`);
  }
  if (staleAfter !== undefined && Number.isNaN(new Date(staleAfter).getTime())) {
    throw new UserError(`Invalid --stale-after "${staleAfter}". Use an ISO 8601 date such as 2026-12-31.`);
  }

  const { file, rel } = locatePage(root, cwd, path);
  const text = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(text);
  if (!data) throw new UserError(`${rel} has no parseable frontmatter; fix it first (okw validate).`);
  const todos = countTodos(body);
  if (todos && !force) {
    throw new UserError(`${rel} still has ${todos} unfilled TODO placeholder${todos > 1 ? 's' : ''}. Fill them in before verifying (or use --force).`);
  }

  const at = isoNow(now);
  const next = editFrontmatter(text, (doc) => {
    const entries = verifiedList(data).filter((e) => e.by !== actor);
    entries.push({ by: actor, at });
    const seq = doc.createNode(entries);
    for (const item of seq.items) item.flow = true;
    doc.set('verified', seq);
    if (status !== undefined) doc.set('status', status);
    if (staleAfter !== undefined) doc.set('stale_after', staleAfter);
  });
  writeFileSync(file, next);

  const after = parseFrontmatter(next).data;
  const tier = trustTier(after);
  return {
    path: rel,
    verified: verifiedList(after),
    tier,
    status: after.status ?? 'stable',
    ...(staleAfter !== undefined ? { stale_after: staleAfter } : {}),
    text: `Verified ${rel} as ${actor} (${tier}).${status ? ` Status: ${status}.` : ''}${staleAfter ? ` Stale after ${staleAfter}.` : ''}`,
  };
}
