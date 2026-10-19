import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, okw } from './helpers.js';

const read = (dir, rel) => readFileSync(join(dir, 'wiki', rel), 'utf8');

test('init crea el núcleo, índices, log y páginas obligatorias', async () => {
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
    assert.match(read(dir, 'overview/index.md'), /\[Project\]\(\/overview\/project\.md\) - Qué es el proyecto/);
    assert.match(read(dir, 'log.md'), /^# Log\n\n## \d{4}-\d{2}-\d{2}\n\* \*\*Init\*\*/);
    assert.ok(!existsSync(join(dir, 'wiki/features')), 'las carpetas opcionales no se crean por defecto');
  } finally {
    cleanup();
  }
});

test('init --with crea carpetas opcionales y rechaza nombres desconocidos', async () => {
  const { dir, cleanup } = tempDir();
  try {
    const bad = await okw(dir, 'init', '--with', 'nope');
    assert.equal(bad.code, 1);
    assert.match(bad.err, /no es una carpeta opcional/);
    const ok = await okw(dir, 'init', '--with', 'features,modules');
    assert.equal(ok.code, 0);
    assert.ok(existsSync(join(dir, 'wiki/features/index.md')));
    assert.ok(existsSync(join(dir, 'wiki/modules/index.md')));
  } finally {
    cleanup();
  }
});

test('init no sobrescribe una wiki existente', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const again = await okw(dir, 'init');
    assert.equal(again.code, 1);
    assert.match(again.err, /Ya existe una wiki/);
  } finally {
    cleanup();
  }
});

test('new crea la página con esqueleto, la indexa y la apunta en el log', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'pattern', 'state-management', '--description', 'Estado de pantalla.');
    assert.equal(r.code, 0, r.err);
    const page = read(dir, 'patterns/state-management.md');
    assert.match(page, /^---\ntype: Pattern\ntitle: State management\ndescription: Estado de pantalla\.\n/);
    assert.match(page, /generated: \{ by: okw\/0\.1\.0, at: \d{4}-\d{2}-\d{2}T[\d:]+Z \}/);
    assert.match(page, /status: draft/);
    for (const s of ['When to use', 'How', 'Example', 'Why']) assert.match(page, new RegExp(`# ${s}\\n`));
    assert.match(read(dir, 'patterns/index.md'), /\[State management\]\(\/patterns\/state-management\.md\) - Estado de pantalla\./);
    assert.match(read(dir, 'log.md'), /\*\*Add\*\* \[patterns\/state-management\]\(\/patterns\/state-management\.md\)/);
  } finally {
    cleanup();
  }
});

test('new valida tipo, descripción, kebab-case y duplicados', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const t = await okw(dir, 'new', 'cosa', 'x', '--description', 'd');
    assert.match(t.err, /Tipo desconocido/);
    const d = await okw(dir, 'new', 'pattern', 'x');
    assert.match(d.err, /Falta --description/);
    const k = await okw(dir, 'new', 'pattern', 'State_Management', '--description', 'd');
    assert.match(k.err, /no es kebab-case/);
    await okw(dir, 'new', 'pattern', 'x', '--description', 'd');
    const dup = await okw(dir, 'new', 'pattern', 'x', '--description', 'd');
    assert.match(dup.err, /Ya existe patterns\/x\.md/);
  } finally {
    cleanup();
  }
});

test('new en una carpeta opcional la crea e indexa; admite subcarpetas', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'module', 'auth/core', '--description', 'Núcleo.');
    assert.equal(r.code, 0, r.err);
    assert.match(read(dir, 'index.md'), /\[Modules\]\(\/modules\/index\.md\)/);
    assert.match(read(dir, 'modules/index.md'), /\[Auth\]\(\/modules\/auth\/index\.md\)/);
    assert.match(read(dir, 'modules/auth/index.md'), /\[Core\]\(\/modules\/auth\/core\.md\) - Núcleo\./);
  } finally {
    cleanup();
  }
});

test('new --json devuelve datos estructurados', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    const r = await okw(dir, 'new', 'convention', 'naming', '--description', 'Nombres.', '--json');
    const data = JSON.parse(r.out);
    assert.equal(data.path, 'conventions/naming.md');
    assert.deepEqual(data.sections, ['# Rule', '# Examples']);
  } finally {
    cleanup();
  }
});

test('index regenera y --check detecta índices desactualizados', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    assert.equal((await okw(dir, 'index', '--check')).code, 0);
    writeFileSync(
      join(dir, 'wiki/conventions/naming.md'),
      '---\ntype: Convention\ntitle: Naming\ndescription: Nombres.\n---\n# Rule\n',
    );
    const check = await okw(dir, 'index', '--check');
    assert.equal(check.code, 1);
    assert.match(check.out, /conventions\/index\.md/);
    assert.equal((await okw(dir, 'index')).code, 0);
    assert.equal((await okw(dir, 'index', '--check')).code, 0);
    assert.match(read(dir, 'conventions/index.md'), /\[Naming\]\(\/conventions\/naming\.md\) - Nombres\./);
  } finally {
    cleanup();
  }
});

test('log agrupa por fecha, lo más reciente primero', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    await okw(dir, 'log', 'Primero');
    await okw(dir, 'log', 'Segundo', '--page', 'architecture/layers.md', '--kind', 'Fix');
    const log = read(dir, 'log.md');
    assert.equal(log.match(/^## /gm).length, 1);
    assert.ok(log.indexOf('Segundo') < log.indexOf('Primero'));
    assert.match(log, /\* \*\*Fix\*\* \[architecture\/layers\]\(\/architecture\/layers\.md\) - Segundo/);
  } finally {
    cleanup();
  }
});

test('--wiki y búsqueda hacia arriba localizan la wiki', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init', 'docs/wiki');
    mkdirSync(join(dir, 'src/deep'), { recursive: true });
    const viaSearch = await okw(join(dir, 'src/deep'), 'log', 'desde dentro');
    assert.equal(viaSearch.code, 0, viaSearch.err);
    const viaFlag = await okw(dir, 'log', 'con flag', '--wiki', 'docs/wiki');
    assert.equal(viaFlag.code, 0, viaFlag.err);
    const none = await okw(join(dir, '..'), 'log', 'x');
    assert.equal(none.code, 1);
  } finally {
    cleanup();
  }
});

test('comando desconocido y ayuda', async () => {
  const { dir, cleanup } = tempDir();
  try {
    assert.equal((await okw(dir, 'nada')).code, 1);
    const help = await okw(dir, '--help');
    assert.equal(help.code, 0);
    assert.match(help.out, /init \[carpeta\]/);
    assert.match((await okw(dir, 'new', '--help')).out, /okw new <type>/);
  } finally {
    cleanup();
  }
});
