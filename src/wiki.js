import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PROFILE_FILE } from './profile.js';
import { UserError } from './errors.js';

// La raíz de la wiki es la carpeta que contiene .okf-profile.yaml.
export function findWikiRoot(cwd, explicit) {
  if (explicit) {
    const root = resolve(cwd, explicit);
    if (!existsSync(join(root, PROFILE_FILE))) {
      throw new UserError(`${explicit} no es una wiki okw (falta ${PROFILE_FILE}).`);
    }
    return root;
  }
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, PROFILE_FILE))) return dir;
    // Wiki en ./wiki o ./docs/wiki respecto al directorio actual.
    for (const sub of ['wiki', 'docs/wiki']) {
      if (existsSync(join(dir, sub, PROFILE_FILE))) return join(dir, sub);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new UserError(`No se encuentra ninguna wiki okw desde ${cwd}. Ejecuta "okw init" o usa --wiki <carpeta>.`);
}
