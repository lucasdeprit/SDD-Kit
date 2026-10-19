import { loadProfile } from '../profile.js';
import { appendLog, pageRef } from '../logfile.js';
import { UserError } from '../errors.js';

export const logHelp = `okw log "<message>" [--page <path>] [--kind Update]

Appends a line to log.md under today's date. --page links a page
(path relative to the wiki, e.g. architecture/layers.md).`;

export function logCommand({ root, message, page, kind = 'Update', now = new Date() }) {
  loadProfile(root);
  if (!message?.trim()) throw new UserError('Missing message: okw log "<message>".');
  const body = page ? `${pageRef(page.replace(/^\/+/, ''))} - ${message.trim()}` : message.trim();
  const line = appendLog(root, { kind, text: body }, now);
  return { line, text: `Added to log.md: ${line}` };
}
