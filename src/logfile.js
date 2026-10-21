import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isoDate, writeText } from './util.js';

const TITLE = '# Log\n';

// Appends an entry to log.md: grouped by date, newest first.
export function appendLog(root, entry, now = new Date()) {
  const file = join(root, 'log.md');
  const date = isoDate(now);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : TITLE;
  const lines = text.replace(/\s+$/, '').split('\n');
  // Header: everything before the first "## ".
  let firstGroup = lines.findIndex((l) => l.startsWith('## '));
  if (firstGroup === -1) firstGroup = lines.length;
  const head = [...lines.slice(0, firstGroup), ''].filter((l, i, a) => !(l === '' && a[i - 1] === ''));
  const groups = lines.slice(firstGroup);
  const line = `* **${entry.kind}** ${entry.text}`;

  let out;
  if (groups[0] === `## ${date}`) {
    // Today's group already exists: the new entry goes first.
    const rest = groups.slice(1);
    if (rest[0] === '') rest.shift();
    out = [...head, groups[0], '', line, ...rest];
  } else {
    out = [...head, `## ${date}`, '', line, '', ...groups];
  }
  writeText(file, out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n');
  return line;
}

// Link fragment for log entries: [path](/path.md) - title
export const pageRef = (relPath, title) => `[${relPath.replace(/\.md$/, '')}](/${relPath})${title ? ` - ${title}` : ''}`;
