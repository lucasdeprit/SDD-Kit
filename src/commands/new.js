import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findFolderByType, loadProfile, typeAlias } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';
import { appendLog, pageRef } from '../logfile.js';
import { renderPage } from '../templates.js';
import { assertKebabPath, humanize, writeText } from '../util.js';
import { UserError } from '../errors.js';

export const newHelp = `okw new <type> <nombre> --description "..." [--title "..."] [--by <actor>]

Crea una página con frontmatter y esqueleto de secciones, la registra en el
index.md de su carpeta y apunta la entrada en log.md. El nombre es relativo a
la carpeta del tipo (p. ej. "state-management" o "bloc/state"). El tipo es el
nombre en singular: overview, architecture, pattern, convention, workflow,
testing, feature, module, interface, operation, troubleshooting.`;

export function newPage({ root, type, name, title, description, by, now = new Date(), version }) {
  const profile = loadProfile(root);
  const folder = findFolderByType(profile, type);
  if (!folder) {
    const valid = profile.folders.map((f) => typeAlias(f.type)).join(', ');
    throw new UserError(`Tipo desconocido "${type}". Tipos disponibles: ${valid}.`);
  }
  if (!description?.trim()) {
    throw new UserError('Falta --description: una frase que diga de qué trata la página.');
  }
  const slug = name.replace(/\.md$/, '').replace(/^\/+|\/+$/g, '');
  assertKebabPath(slug);

  const rel = `${folder.name}/${slug}.md`;
  const file = join(root, rel);
  if (existsSync(file)) {
    throw new UserError(`Ya existe ${rel}. Edítala en vez de crearla de nuevo.`);
  }
  const pageTitle = title?.trim() || humanize(slug.split('/').pop());
  const text = renderPage({
    folder,
    title: pageTitle,
    description: description.trim(),
    by: by ?? `okw/${version}`,
    now,
  });
  writeText(file, text);

  const indexes = regenerateIndexes(root, profile);
  appendLog(root, { kind: 'Add', text: pageRef(rel, pageTitle) }, now);
  const sections = folder.sections.map((s) => `# ${s}`);

  return {
    path: rel,
    type: folder.type,
    sections,
    updated: [...indexes, 'log.md'],
    text: [
      `Creada ${rel} (type: ${folder.type}).`,
      `Índices actualizados: ${indexes.join(', ') || 'ninguno'}. Entrada añadida a log.md.`,
      `Rellena estas secciones: ${sections.join(', ')}.`,
    ].join('\n'),
  };
}
