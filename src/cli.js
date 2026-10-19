import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { UserError } from './errors.js';
import { findWikiRoot } from './wiki.js';
import { init, initHelp } from './commands/init.js';
import { newPage, newHelp } from './commands/new.js';
import { indexCommand, indexHelp } from './commands/index.js';
import { logCommand, logHelp } from './commands/log.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `okw ${version} - scaffolding y gestión de wikis OKF

Comandos:
  init [carpeta]            Crea una wiki con el perfil base
  new <type> <nombre>       Crea una página, la indexa y la registra en el log
  index [--check]           Regenera los index.md
  log "<mensaje>"           Añade una línea a log.md

Opciones comunes:
  --wiki <carpeta>          Wiki sobre la que operar (por defecto se busca desde el directorio actual)
  --json                    Salida en JSON, para agentes y scripts
  -h, --help                Ayuda de un comando
  -v, --version

Ejecuta "okw <comando> --help" para más detalle.`;

const COMMON = {
  wiki: { type: 'string' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

const COMMANDS = {
  init: {
    help: initHelp,
    options: { with: { type: 'string' }, language: { type: 'string' }, by: { type: 'string' } },
    run: ({ values, positionals, cwd }) =>
      init({
        cwd,
        dir: positionals[0],
        withFolders: values.with ? values.with.split(',').map((s) => s.trim()).filter(Boolean) : [],
        language: values.language,
        by: values.by,
        version,
      }),
  },
  new: {
    help: newHelp,
    options: { title: { type: 'string' }, description: { type: 'string' }, by: { type: 'string' } },
    needsWiki: true,
    run: ({ values, positionals, root }) => {
      if (positionals.length < 2) throw new UserError('Uso: okw new <type> <nombre> --description "..."');
      return newPage({
        root,
        type: positionals[0],
        name: positionals[1],
        title: values.title,
        description: values.description,
        by: values.by,
        version,
      });
    },
  },
  index: {
    help: indexHelp,
    options: { check: { type: 'boolean' } },
    needsWiki: true,
    run: ({ values, root }) => indexCommand({ root, check: values.check }),
  },
  log: {
    help: logHelp,
    options: { page: { type: 'string' }, kind: { type: 'string' } },
    needsWiki: true,
    run: ({ values, positionals, root }) =>
      logCommand({ root, message: positionals.join(' '), page: values.page, kind: values.kind }),
  },
};

export async function run(argv, { cwd = process.cwd(), out = console.log, err = console.error } = {}) {
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help' || argv[0] === 'help') {
    out(HELP);
    return 0;
  }
  if (argv[0] === '-v' || argv[0] === '--version') {
    out(version);
    return 0;
  }
  const [name, ...rest] = argv;
  const command = COMMANDS[name];
  if (!command) {
    err(`Comando desconocido: ${name}\n\n${HELP}`);
    return 1;
  }
  try {
    const { values, positionals } = parseArgs({
      args: rest,
      options: { ...COMMON, ...command.options },
      allowPositionals: true,
    });
    if (values.help) {
      out(command.help);
      return 0;
    }
    const root = command.needsWiki ? findWikiRoot(cwd, values.wiki) : undefined;
    const result = await command.run({ values, positionals, cwd, root });
    if (values.json) {
      const { text, ...data } = result;
      out(JSON.stringify(data, null, 2));
    } else {
      out(result.text);
    }
    return result.ok === false ? 1 : 0;
  } catch (e) {
    if (e instanceof UserError || e?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' || e?.code?.startsWith?.('ERR_PARSE_ARGS')) {
      err(`Error: ${e.message}`);
      return 1;
    }
    throw e;
  }
}
