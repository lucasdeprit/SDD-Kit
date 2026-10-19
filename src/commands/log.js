import { loadProfile } from '../profile.js';
import { appendLog, pageRef } from '../logfile.js';
import { UserError } from '../errors.js';

export const logHelp = `okw log "<mensaje>" [--page <ruta>] [--kind Update]

Añade una línea a log.md con la fecha de hoy. --page enlaza una página
(ruta relativa a la wiki, p. ej. architecture/layers.md).`;

export function logCommand({ root, message, page, kind = 'Update', now = new Date() }) {
  loadProfile(root);
  if (!message?.trim()) throw new UserError('Falta el mensaje: okw log "<mensaje>".');
  const body = page ? `${pageRef(page.replace(/^\/+/, ''))} - ${message.trim()}` : message.trim();
  const line = appendLog(root, { kind, text: body }, now);
  return { line, text: `Añadido a log.md: ${line}` };
}
