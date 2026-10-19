import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isoDate, writeText } from './util.js';

const TITLE = '# Log\n';

// Añade una entrada a log.md: agrupada por fecha, la más reciente primero.
export function appendLog(root, entry, now = new Date()) {
  const file = join(root, 'log.md');
  const date = isoDate(now);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : TITLE;
  const lines = text.replace(/\s+$/, '').split('\n');
  // Cabecera: todo hasta el primer "## ".
  let firstGroup = lines.findIndex((l) => l.startsWith('## '));
  if (firstGroup === -1) firstGroup = lines.length;
  const head = [...lines.slice(0, firstGroup), ''].filter((l, i, a) => !(l === '' && a[i - 1] === ''));
  const groups = lines.slice(firstGroup);
  const line = `* **${entry.kind}** ${entry.text}`;

  let out;
  if (groups[0] === `## ${date}`) {
    // Ya hay grupo de hoy: la entrada nueva va la primera.
    out = [...head, groups[0], line, ...groups.slice(1)];
  } else {
    out = [...head, `## ${date}`, line, '', ...groups];
  }
  writeText(file, out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n');
  return line;
}

// Fragmento de enlace para entradas de log: [ruta](/ruta.md) - título
export const pageRef = (relPath, title) => `[${relPath.replace(/\.md$/, '')}](/${relPath})${title ? ` - ${title}` : ''}`;
