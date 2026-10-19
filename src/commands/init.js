import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { CORE_FOLDERS, OPTIONAL_FOLDERS, PROFILE_FILE, PROFILE_ID, loadProfile } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';
import { appendLog } from '../logfile.js';
import { requiredPages } from '../templates.js';
import { writeText } from '../util.js';
import { UserError } from '../errors.js';

export const initHelp = `okw init [carpeta] [--with features,modules] [--language es] [--by <actor>]

Crea una wiki con el núcleo del perfil base (por defecto en ./wiki).
  --with      carpetas opcionales a crear ahora: ${OPTIONAL_FOLDERS.map((f) => f.name).join(', ')}
  --language  idioma del contenido, solo informativo (por defecto es)
  --by        actor para "generated" (por defecto okw/<versión>)`;

export function init({ cwd, dir = 'wiki', withFolders = [], language = 'es', by, now = new Date(), version }) {
  const root = resolve(cwd, dir);
  if (existsSync(join(root, PROFILE_FILE))) {
    throw new UserError(`Ya existe una wiki en ${dir} (${PROFILE_FILE}). No se sobrescribe.`);
  }
  const known = new Map(OPTIONAL_FOLDERS.map((f) => [f.name, f]));
  for (const name of withFolders) {
    if (!known.has(name)) {
      throw new UserError(`"${name}" no es una carpeta opcional. Opciones: ${[...known.keys()].join(', ')}.`);
    }
  }

  const actor = by ?? `okw/${version}`;
  const profileText = `# Perfil okw de esta wiki. Ver SPEC.md.\n${stringify({
    profile: PROFILE_ID,
    language,
    extra_folders: [],
  })}`;
  writeText(join(root, PROFILE_FILE), profileText);

  const created = [PROFILE_FILE];
  for (const folder of [...CORE_FOLDERS, ...withFolders.map((n) => known.get(n))]) {
    mkdirSync(join(root, folder.name), { recursive: true });
    created.push(`${folder.name}/`);
  }
  for (const page of requiredPages({ by: actor, now })) {
    writeText(join(root, page.path), page.text);
    created.push(page.path);
  }

  const profile = loadProfile(root);
  appendLog(root, { kind: 'Init', text: `Wiki creada con el perfil ${PROFILE_ID}.` }, now);
  created.push('log.md');
  const indexes = regenerateIndexes(root, profile);
  created.push(...indexes);

  return { root, created, text: [`Wiki creada en ${dir}`, ...created.map((c) => `  ${c}`)].join('\n') };
}
