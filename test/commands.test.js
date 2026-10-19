import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, okw } from './helpers.js';

const read = (dir, rel) => readFileSync(join(dir, 'wiki', rel), 'utf8');

test('init creates the core, indexes, log and required pages', async () => {
  const { dir, cleanup } = tempDir();
  try {
    const r = await okw(dir, 'init');
    assert.equal(r.code, 0);
    for (const f of ['overview', 'architecture', 'patterns', 'conventions', 'workflows', 'testing']) {
      assert.ok(existsSync(join(dir, 'wiki', f, 'index.md')), `${f}/index.md`);
    }
    assert.ok(existsSync(join(dir, 'wiki/.okf-profile.yaml')));
    assert.ok(existsSync(join(dir, 'wiki/overview/project.md')));
    assert.ok(existsSync(join(dir, 'wiki/workflows/update-wiki.md')));
    assert.match(read(dir, 'index.md'), /^---\nokf_version: "0.2"\n---\n# Index/);
    assert.match(read(dir, 'overview/index.md'), /\[Project\]\(\/overview\/project\.md\) - What the project is/);
    assert.match(read(dir, 'log.md'), /^# Log\n\n## \d{4}-\d{2}-\d{2}\n\* \*\*Init\*\*/);
    assert.ok(!existsSync(join(dir, 'wiki/features')), 'optional folders are not created by default');
  } finally {
    cleanup();
  }
});

test('init --with creates optional folders and rejects unknown names', async () => {
  const { dir, cleanup } = tempDir();
  try {
    const bad = await okw(dir, 'init', '--with', 'nope');
    assert.equal(bad.code, 1);
    assert.match(bad.err, /is not an optional folder/);
    const ok = await okw(dir, 'init', '--with', 'features,modules');
    assert.equal(ok.code, 0);
    assert.ok(existsSync(join(dir, 'wiki/features/index.md')));
    assert.ok(existsSync(join(dir, 'wiki/modules/index.md')));
  } finally {
    cleanup();
  }
});

test('init does not overwrite an existing wiki', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const again = await okw(dir, 'init');
    assert.equal(again.code, 1);
    assert.match(again.err, /A wiki already exists/);
  } finally {
    cleanup();
  }
});

test('new creates the page with a skeleton, indexes it and records it in the log', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'pattern', 'state-management', '--description', 'Screen state.');
    assert.equal(r.code, 0, r.err);
    const page = read(dir, 'patterns/state-management.md');
    assert.match(page, /^---\ntype: Pattern\ntitle: State management\ndescription: Screen state\.\n/);
    assert.match(page, /generated: \{ by: okw\/0\.1\.0, at: \d{4}-\d{2}-\d{2}T[\d:]+Z \}/);
    assert.match(page, /status: draft/);
    for (const s of ['When to use', 'How', 'Example', 'Why']) assert.match(page, new RegExp(`# ${s}\\n`));
    assert.match(read(dir, 'patterns/index.md'), /\[State management\]\(\/patterns\/state-management\.md\) - Screen state\./);
    assert.match(read(dir, 'log.md'), /\*\*Add\*\* \[patterns\/state-management\]\(\/patterns\/state-management\.md\)/);
  } finally {
    cleanup();
  }
});

test('new validates type, description, kebab-case and duplicates', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const t = await okw(dir, 'new', 'cosa', 'x', '--description', 'd');
    assert.match(t.err, /Unknown type/);
    const d = await okw(dir, 'new', 'pattern', 'x');
    assert.match(d.err, /Missing --description/);
    const k = await okw(dir, 'new', 'pattern', 'State_Management', '--description', 'd');
    assert.match(k.err, /is not kebab-case/);
    await okw(dir, 'new', 'pattern', 'x', '--description', 'd');
    const dup = await okw(dir, 'new', 'pattern', 'x', '--description', 'd');
    assert.match(dup.err, /patterns\/x\.md already exists/);
  } finally {
    cleanup();
  }
});

test('new in an optional folder creates and indexes it; supports subfolders', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'module', 'auth/core', '--description', 'Core.');
    assert.equal(r.code, 0, r.err);
    assert.match(read(dir, 'index.md'), /\[Modules\]\(\/modules\/index\.md\)/);
    assert.match(read(dir, 'modules/index.md'), /\[Auth\]\(\/modules\/auth\/index\.md\)/);
    assert.match(read(dir, 'modules/auth/index.md'), /\[Core\]\(\/modules\/auth\/core\.md\) - Core\./);
  } finally {
    cleanup();
  }
});

test('new --json returns structured data', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'convention', 'naming', '--description', 'Naming.', '--json');
    const data = JSON.parse(r.out);
    assert.equal(data.path, 'conventions/naming.md');
    assert.deepEqual(data.sections, ['# Rule', '# Examples']);
  } finally {
    cleanup();
  }
});

test('index regenerates and --check detects out-of-date indexes', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    assert.equal((await okw(dir, 'index', '--check')).code, 0);
    writeFileSync(
      join(dir, 'wiki/conventions/naming.md'),
      '---\ntype: Convention\ntitle: Naming\ndescription: Naming.\n---\n# Rule\n',
    );
    const check = await okw(dir, 'index', '--check');
    assert.equal(check.code, 1);
    assert.match(check.out, /conventions\/index\.md/);
    assert.equal((await okw(dir, 'index')).code, 0);
    assert.equal((await okw(dir, 'index', '--check')).code, 0);
    assert.match(read(dir, 'conventions/index.md'), /\[Naming\]\(\/conventions\/naming\.md\) - Naming\./);
  } finally {
    cleanup();
  }
});

test('log groups by date, newest first', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    await okw(dir, 'log', 'First');
    await okw(dir, 'log', 'Second', '--page', 'architecture/layers.md', '--kind', 'Fix');
    const log = read(dir, 'log.md');
    assert.equal(log.match(/^## /gm).length, 1);
    assert.ok(log.indexOf('Second') < log.indexOf('First'));
    assert.match(log, /\* \*\*Fix\*\* \[architecture\/layers\]\(\/architecture\/layers\.md\) - Second/);
  } finally {
    cleanup();
  }
});

test('--wiki and upward search locate the wiki', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init', 'docs/wiki');
    mkdirSync(join(dir, 'src/deep'), { recursive: true });
    const viaSearch = await okw(join(dir, 'src/deep'), 'log', 'from inside');
    assert.equal(viaSearch.code, 0, viaSearch.err);
    const viaFlag = await okw(dir, 'log', 'with flag', '--wiki', 'docs/wiki');
    assert.equal(viaFlag.code, 0, viaFlag.err);
    const none = await okw(join(dir, '..'), 'log', 'x');
    assert.equal(none.code, 1);
  } finally {
    cleanup();
  }
});

test('unknown command and help', async () => {
  const { dir, cleanup } = tempDir();
  try {
    assert.equal((await okw(dir, 'nada')).code, 1);
    const help = await okw(dir, '--help');
    assert.equal(help.code, 0);
    assert.match(help.out, /init \[folder\]/);
    assert.match((await okw(dir, 'new', '--help')).out, /okw new <type>/);
  } finally {
    cleanup();
  }
});
