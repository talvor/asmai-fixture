import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each test gets its own store, so no test ever touches ~/.asmai-fixture.json.
const tempStore = () => join(mkdtempSync(join(tmpdir(), 'asmai-fixture-')), 'store.json');

const run = (store, ...args) =>
  spawnSync(process.execPath, ['src/index.js', ...args], {
    encoding: 'utf8',
    env: { ...process.env, ASMAI_FIXTURE_STORE: store },
  });

const warningLines = (stderr) => stderr.split('\n').filter((line) => line !== '');

const damagedStores = {
  'invalid JSON': '{"name": "Ada", ',
  'valid JSON that is not a list': '{"name": "Ada", "greetedAt": "2026-10-29T00:00:00.000Z"}\n',
  'a list that is not of greetings': '[1, "Ada", null]\n',
};

for (const [kind, contents] of Object.entries(damagedStores)) {
  test(`greeting with ${kind} still greets, warns once and leaves the store untouched`, () => {
    const store = tempStore();
    writeFileSync(store, contents);
    const result = run(store, 'Ada');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'Hello, Ada!\n');
    assert.equal(warningLines(result.stderr).length, 1);
    assert.match(result.stderr, /^Warning: Ada was not remembered: the store at .+ is damaged/);
    assert.equal(readFileSync(store, 'utf8'), contents);
  });

  test(`--recent with ${kind} warns on stderr, prints nothing and exits 1`, () => {
    const store = tempStore();
    writeFileSync(store, contents);
    const result = run(store, '--recent');
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(warningLines(result.stderr).length, 1);
    assert.match(result.stderr, /^Warning: cannot list recent names: the store at .+ is damaged/);
    assert.equal(readFileSync(store, 'utf8'), contents);
  });
}

test('greeting with a directory at the store path still greets and warns once', () => {
  const store = tempStore();
  mkdirSync(store);
  const result = run(store, 'Ada');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Hello, Ada!\n');
  assert.equal(warningLines(result.stderr).length, 1);
});

test('--recent with a directory at the store path warns and exits 1', () => {
  const store = tempStore();
  mkdirSync(store);
  const result = run(store, '--recent');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(warningLines(result.stderr).length, 1);
});

// Root reads any file regardless of mode, and Windows ignores the mode bits.
const permissionsEnforced = process.platform !== 'win32' && process.getuid?.() !== 0;

test('greeting with a permission-denied store still greets and leaves it untouched', { skip: !permissionsEnforced }, () => {
  const store = tempStore();
  const contents = '[]\n';
  writeFileSync(store, contents);
  chmodSync(store, 0o000);
  try {
    const result = run(store, 'Ada');
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'Hello, Ada!\n');
    assert.equal(warningLines(result.stderr).length, 1);
  } finally {
    chmodSync(store, 0o600);
  }
  assert.equal(readFileSync(store, 'utf8'), contents);
});

test('--recent with a permission-denied store warns and exits 1', { skip: !permissionsEnforced }, () => {
  const store = tempStore();
  writeFileSync(store, '[]\n');
  chmodSync(store, 0o000);
  try {
    const result = run(store, '--recent');
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(warningLines(result.stderr).length, 1);
  } finally {
    chmodSync(store, 0o600);
  }
});
