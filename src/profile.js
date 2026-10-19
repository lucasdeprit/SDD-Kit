import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { UserError } from './errors.js';

export const PROFILE_ID = 'base@0.1';
export const PROFILE_FILE = '.okf-profile.yaml';
export const OKF_VERSION = '0.2';

// Carpetas del perfil base. Los nombres y `type` son fijos; ver SPEC.md sección 3.
const core = (name, type, title, description, sections) => ({
  name,
  type,
  title,
  description,
  sections,
  core: true,
});
const optional = (name, type, title, description, sections) => ({
  name,
  type,
  title,
  description,
  sections,
  core: false,
});

export const CORE_FOLDERS = [
  core('overview', 'Overview', 'Overview', 'Qué es el proyecto, su alcance y su glosario.', ['Purpose', 'Scope']),
  core('architecture', 'Architecture', 'Architecture', 'Estructura, capas y reglas de dependencias.', ['Overview', 'Rules', 'Why']),
  core('patterns', 'Pattern', 'Patterns', 'Cómo se implementa cada cosa, con un ejemplo real.', ['When to use', 'How', 'Example', 'Why']),
  core('conventions', 'Convention', 'Conventions', 'Estilo, nombres y convenciones de trabajo.', ['Rule', 'Examples']),
  core('workflows', 'Workflow', 'Workflows', 'Cómo se trabaja: setup, build, PRs, releases, onboarding.', ['Goal', 'Steps']),
  core('testing', 'Testing', 'Testing', 'Estrategia de testing, cómo ejecutarlo y reglas.', ['Scope', 'How to run', 'Rules']),
];

export const OPTIONAL_FOLDERS = [
  optional('features', 'Feature', 'Features', 'Capacidades de negocio y flujos.', ['Summary', 'Behavior']),
  optional('modules', 'Module', 'Modules', 'Paquetes y componentes internos.', ['Responsibility', 'Public API']),
  optional('interfaces', 'Interface', 'Interfaces', 'Contratos externos: APIs, eventos, integraciones.', ['Contract', 'Consumers']),
  optional('operations', 'Operation', 'Operations', 'Despliegue, runbooks e incidentes.', ['When', 'Steps']),
  optional('troubleshooting', 'Troubleshooting', 'Troubleshooting', 'Errores conocidos y su arreglo.', ['Symptom', 'Cause', 'Fix']),
];

// Alias de línea de comandos para un tipo: "Pattern" -> "pattern".
export const typeAlias = (type) => type.toLowerCase().replace(/\s+/g, '-');

export function loadProfile(wikiRoot) {
  const file = join(wikiRoot, PROFILE_FILE);
  if (!existsSync(file)) {
    throw new UserError(`No se encuentra ${PROFILE_FILE} en ${wikiRoot}. ¿Es una wiki okw? Ejecuta "okw init".`);
  }
  let config;
  try {
    config = parse(readFileSync(file, 'utf8')) ?? {};
  } catch (err) {
    throw new UserError(`${PROFILE_FILE} no es YAML válido: ${err.message}`);
  }
  const extra = (config.extra_folders ?? []).map((f) => {
    if (!f?.name || !f?.type) {
      throw new UserError(`${PROFILE_FILE}: cada entrada de extra_folders necesita "name" y "type".`);
    }
    const sections = (f.sections ?? []).map((s) => String(s).replace(/^#+\s*/, ''));
    return { name: f.name, type: f.type, title: f.title ?? f.type, description: f.description ?? '', sections, core: false, extra: true };
  });
  return {
    config,
    folders: [...CORE_FOLDERS, ...OPTIONAL_FOLDERS, ...extra],
  };
}

export function findFolderByType(profile, alias) {
  return profile.folders.find((f) => typeAlias(f.type) === alias.toLowerCase());
}
