import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { UserError } from './errors.js';
import { findWikiRoot } from './wiki.js';
import { init, initHelp } from './commands/init.js';
import { newPage, newHelp } from './commands/new.js';
import { indexCommand, indexHelp } from './commands/index.js';
import { validateCommand, validateHelp } from './commands/validate.js';
import { verifyCommand, verifyHelp } from './commands/verify.js';
import { statusCommand, statusHelp } from './commands/status.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `okw ${version} - scaffolding and management of OKF wikis

Commands:
  init [folder]             Create a wiki with the base profile
  new <type> <name>         Create a page and register it in its index
  index [--check]           Regenerate the index.md files
  validate [--fix]          Check the wiki against OKF and the profile
  verify <path>             Record that a page has been reviewed
  status                    Summarise stale, unverified, draft and deprecated pages

Common options:
  --wiki <folder>           Wiki to operate on (by default it is searched from the current directory)
  --json                    JSON output, for agents and scripts
  -h, --help                Help for a command
  -v, --version

Run "okw <command> --help" for details.`;

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
      if (positionals.length < 2) throw new UserError('Usage: okw new <type> <name> --description "..."');
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
  verify: {
    help: verifyHelp,
    options: {
      by: { type: 'string' },
      status: { type: 'string' },
      'stale-after': { type: 'string' },
      force: { type: 'boolean' },
    },
    needsWiki: true,
    run: ({ values, positionals, root, cwd }) =>
      verifyCommand({
        root,
        cwd,
        path: positionals[0],
        by: values.by,
        status: values.status,
        staleAfter: values['stale-after'],
        force: values.force,
        version,
      }),
  },
  status: {
    help: statusHelp,
    options: { only: { type: 'string' } },
    needsWiki: true,
    run: ({ values, root }) => statusCommand({ root, only: values.only }),
  },
  validate: {
    help: validateHelp,
    options: { fix: { type: 'boolean' }, strict: { type: 'boolean' } },
    needsWiki: true,
    run: ({ values, root }) => validateCommand({ root, fix: values.fix, strict: values.strict, version }),
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
    err(`Unknown command: ${name}\n\n${HELP}`);
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
