import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findFolderByType, loadProfile, typeAlias } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';
import { appendLog, pageRef } from '../logfile.js';
import { renderPage } from '../templates.js';
import { assertKebabPath, humanize, writeText } from '../util.js';
import { UserError } from '../errors.js';

export const newHelp = `okw new <type> <name> --description "..." [--title "..."] [--by <actor>]

Creates a page with frontmatter and a section skeleton, registers it in the
index.md of its folder and records an entry in log.md. The name is relative to
the folder of the type (e.g. "state-management" or "bloc/state"). The type is
the singular name: overview, architecture, pattern, convention, workflow,
testing, feature, module, interface, operation, troubleshooting.`;

export function newPage({ root, type, name, title, description, by, now = new Date(), version }) {
  const profile = loadProfile(root);
  const folder = findFolderByType(profile, type);
  if (!folder) {
    const valid = profile.folders.map((f) => typeAlias(f.type)).join(', ');
    throw new UserError(`Unknown type "${type}". Available types: ${valid}.`);
  }
  if (!description?.trim()) {
    throw new UserError('Missing --description: one sentence saying what the page is about.');
  }
  const slug = name.replace(/\.md$/, '').replace(/^\/+|\/+$/g, '');
  assertKebabPath(slug);

  const rel = `${folder.name}/${slug}.md`;
  const file = join(root, rel);
  if (existsSync(file)) {
    throw new UserError(`${rel} already exists. Edit it instead of creating it again.`);
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
      `Created ${rel} (type: ${folder.type}).`,
      `Indexes updated: ${indexes.join(', ') || 'none'}. Entry added to log.md.`,
      `Fill in these sections: ${sections.join(', ')}.`,
    ].join('\n'),
  };
}
