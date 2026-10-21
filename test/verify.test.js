import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, okw } from './helpers.js';

const W = (dir, rel) => join(dir, 'wiki', rel);
const read = (dir, rel) => readFileSync(W(dir, rel), 'utf8');

// A pattern page whose placeholders are filled in, with frontmatter comments to check they survive.
const filled = (extraFront = '') =>
  `---\n# keep this comment\ntype: Pattern\ntitle: State\ndescription: State.\ngenerated: { by: okw/0.1.0, at: 2026-10-19T09:00:00Z }\nstatus: draft\n${extraFront}---\n\n# When to use\n\nAlways.\n\n# How\n\nLike this.\n\n# Example\n\nCode.\n\n# Why\n\nBecause.\n`;

async function setup(dir, front) {
  await okw(dir, 'init');
  await okw(dir, 'new', 'pattern', 'state', '--description', 'State.');
  writeFileSync(W(dir, 'patterns/state.md'), filled(front));
}

test('verify adds a { by, at } entry and keeps the rest of the file intact', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    const r = await okw(dir, 'verify', 'patterns/state', '--by', 'human:ana', '--json');
    assert.equal(r.code, 0, r.err);
    const data = JSON.parse(r.out);
    assert.equal(data.tier, 'human-reviewed');
    assert.equal(data.verified.length, 1);
    const page = read(dir, 'patterns/state.md');
    assert.match(page, /# keep this comment/);
    assert.match(page, /generated: \{ by: okw\/0\.1\.0, at: 2026-10-19T09:00:00Z \}/);
    assert.match(page, /verified:\n  - \{ by: human:ana, at: \d{4}-\d{2}-\d{2}T[\d:]+Z \}/);
    assert.match(page, /\n---\n\n# When to use\n\nAlways\.\n/);
  } finally {
    cleanup();
  }
});

test('verify replaces the entry of the same actor and keeps the others', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    await okw(dir, 'verify', 'patterns/state.md', '--by', 'human:ana');
    await okw(dir, 'verify', 'patterns/state.md', '--by', 'process:nightly');
    await okw(dir, 'verify', 'patterns/state.md', '--by', 'human:ana');
    const page = read(dir, 'patterns/state.md');
    assert.equal(page.match(/human:ana/g).length, 1);
    assert.equal(page.match(/process:nightly/g).length, 1);
  } finally {
    cleanup();
  }
});

test('verify converts a single { by, at } mapping into a list', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir, 'verified: { by: human:bo, at: 2026-10-01T00:00:00Z }\n');
    await okw(dir, 'verify', 'patterns/state', '--by', 'process:ci');
    const page = read(dir, 'patterns/state.md');
    assert.match(page, /verified:\n  - \{ by: human:bo, at: 2026-10-01T00:00:00Z \}\n  - \{ by: process:ci,/);
  } finally {
    cleanup();
  }
});

test('verify defaults to a machine actor, and honours OKW_ACTOR', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    const r = JSON.parse((await okw(dir, 'verify', 'patterns/state', '--json')).out);
    assert.equal(r.tier, 'machine-confirmed');
    assert.equal(r.verified[0].by, 'okw/0.1.0');
  } finally {
    cleanup();
  }
});

test('verify can set status and stale_after', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    await okw(dir, 'verify', 'patterns/state', '--by', 'human:ana', '--status', 'stable', '--stale-after', '2026-12-31');
    const page = read(dir, 'patterns/state.md');
    assert.match(page, /status: stable/);
    assert.match(page, /stale_after: 2026-12-31/);
    assert.ok(!/status: draft/.test(page));
    assert.equal((await okw(dir, 'validate', '--json')).code, 0);
  } finally {
    cleanup();
  }
});

test('verify refuses pages with unfilled TODOs unless --force', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await okw(dir, 'init');
    await okw(dir, 'new', 'pattern', 'state', '--description', 'State.');
    const refused = await okw(dir, 'verify', 'patterns/state', '--by', 'human:ana');
    assert.equal(refused.code, 1);
    assert.match(refused.err, /4 unfilled TODO placeholders/);
    assert.ok(!/verified/.test(read(dir, 'patterns/state.md')));
    const forced = await okw(dir, 'verify', 'patterns/state', '--by', 'human:ana', '--force');
    assert.equal(forced.code, 0, forced.err);
  } finally {
    cleanup();
  }
});

test('verify validates its inputs', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    assert.match((await okw(dir, 'verify')).err, /Usage: okw verify/);
    assert.match((await okw(dir, 'verify', 'patterns/nope')).err, /Page not found/);
    assert.match((await okw(dir, 'verify', 'patterns/state', '--by', 'ana')).err, /Invalid actor/);
    assert.match((await okw(dir, 'verify', 'patterns/state', '--status', 'ok')).err, /Invalid status/);
    assert.match((await okw(dir, 'verify', 'patterns/state', '--stale-after', 'soon')).err, /Invalid --stale-after/);
    writeFileSync(W(dir, 'patterns/raw.md'), '# no frontmatter\n');
    assert.match((await okw(dir, 'verify', 'patterns/raw')).err, /no parseable frontmatter/);
  } finally {
    cleanup();
  }
});

test('verify accepts a path relative to the current directory', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    const r = await okw(join(dir, 'wiki/patterns'), 'verify', 'state.md', '--by', 'human:ana');
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /Verified patterns\/state\.md/);
  } finally {
    cleanup();
  }
});

test('status summarises states and trust tiers and lists pages needing attention', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir, 'stale_after: 2020-01-01\n');
    await okw(dir, 'verify', 'patterns/state', '--by', 'human:ana', '--status', 'stable');
    writeFileSync(W(dir, 'patterns/old.md'), filled().replace('title: State', 'title: Old').replace('status: draft', 'status: deprecated'));
    await okw(dir, 'index');
    const r = JSON.parse((await okw(dir, 'status', '--json')).out);
    assert.equal(r.total, 5);
    assert.equal(r.by_status.deprecated, 1);
    assert.equal(r.by_trust['human-reviewed'], 1);
    const flags = Object.fromEntries(r.pages.map((p) => [p.path, p.flags]));
    assert.deepEqual(flags['patterns/state.md'], ['stale']);
    assert.deepEqual(flags['patterns/old.md'], ['unverified', 'deprecated']);
    assert.ok(flags['testing/strategy.md'].includes('todo'));
    const text = (await okw(dir, 'status')).out;
    assert.match(text, /5 pages/);
    assert.match(text, /patterns\/state\.md\s+stale since 2020-01-01/);
  } finally {
    cleanup();
  }
});

test('status --only filters and validates the filter', async () => {
  const { dir, cleanup } = tempDir();
  try {
    await setup(dir);
    const r = JSON.parse((await okw(dir, 'status', '--only', 'todo', '--json')).out);
    assert.ok(r.pages.length > 0 && r.pages.every((p) => p.flags.includes('todo')));
    assert.ok(!r.pages.some((p) => p.path === 'patterns/state.md'));
    const none = await okw(dir, 'status', '--only', 'stale');
    assert.match(none.out, /No pages flagged "stale"/);
    assert.equal((await okw(dir, 'status', '--only', 'wat')).code, 1);
  } finally {
    cleanup();
  }
});
