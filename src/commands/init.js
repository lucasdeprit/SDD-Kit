import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stringify } from 'yaml';
import { CORE_FOLDERS, OPTIONAL_FOLDERS, PROFILE_FILE, PROFILE_ID, loadProfile } from '../profile.js';
import { regenerateIndexes } from '../indexer.js';
import { requiredPages, testingStrategyPage } from '../templates.js';
import { writeText } from '../util.js';
import { UserError } from '../errors.js';

export const initHelp = `okw init [folder] [--with features,modules] [--language en]

Creates a wiki with the base profile core (in ./wiki by default).
  --with      optional folders to create now: ${OPTIONAL_FOLDERS.map((f) => f.name).join(', ')}
  --language  language of the wiki content, informational only (default: en)
`;

export function init({ cwd, dir = 'wiki', withFolders = [], language = 'en' }) {
  const root = resolve(cwd, dir);
  if (existsSync(join(root, PROFILE_FILE))) {
    throw new UserError(`A wiki already exists in ${dir} (${PROFILE_FILE}). It will not be overwritten.`);
  }
  const known = new Map(OPTIONAL_FOLDERS.map((f) => [f.name, f]));
  for (const name of withFolders) {
    if (!known.has(name)) {
      throw new UserError(`"${name}" is not an optional folder. Options: ${[...known.keys()].join(', ')}.`);
    }
  }

  const profileText = `# okw profile of this wiki. See SPEC.md.\n${stringify({
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
  for (const page of [...requiredPages(), testingStrategyPage()]) {
    writeText(join(root, page.path), page.text);
    created.push(page.path);
  }

  const profile = loadProfile(root);
  const indexes = regenerateIndexes(root, profile);
  created.push(...indexes);

  return { root, created, text: [`Wiki created in ${dir}`, ...created.map((c) => `  ${c}`)].join('\n') };
}
