import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each test gets its own store, so no test ever touches ~/.asmai-fixture.json.
const tempStore = () => join(mkdtempSync(join(tmpdir(), 'asmai-fixture-')), 'store.json');

const runWith = (store) => (...args) =>
  execFileSync(process.execPath, ['src/index.js', ...args], {
    encoding: 'utf8',
    env: { ...process.env, ASMAI_FIXTURE_STORE: store },
  });

const readStore = (store) => JSON.parse(readFileSync(store, 'utf8'));

test('creates the store on the first greeting', () => {
  const store = tempStore();
  assert.equal(existsSync(store), false);
  runWith(store)('asmai');
  const entries = readStore(store);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'asmai');
  assert.ok(!Number.isNaN(Date.parse(entries[0].greetedAt)));
});

test('remembers names across separate runs, in order', () => {
  const store = tempStore();
  const run = runWith(store);
  run('Ada');
  run('Grace');
  assert.deepEqual(readStore(store).map((e) => e.name), ['Ada', 'Grace']);
});

test('remembers the default name like any other', () => {
  const store = tempStore();
  assert.equal(runWith(store)(), 'Hello, Phillip!\n');
  assert.deepEqual(readStore(store).map((e) => e.name), ['Phillip']);
});

test('--recent lists greeted names newest first, one per line', () => {
  const store = tempStore();
  const run = runWith(store);
  run('Ada');
  run();
  run('Grace');
  assert.equal(run('--recent'), 'Grace\nPhillip\nAda\n');
});

test('--recent does not greet or remember anyone', () => {
  const store = tempStore();
  const run = runWith(store);
  run('Ada');
  run('--recent');
  assert.deepEqual(readStore(store).map((e) => e.name), ['Ada']);
});

test('--recent lists a name greeted repeatedly once, at its latest position', () => {
  const store = tempStore();
  const run = runWith(store);
  run('Ada');
  run('Grace');
  run('Ada');
  assert.equal(run('--recent'), 'Ada\nGrace\n');
  // Every greeting is still recorded; deduplication happens only on read.
  assert.deepEqual(readStore(store).map((e) => e.name), ['Ada', 'Grace', 'Ada']);
});

test('--recent lists only the 5 most recent distinct names, newest first', () => {
  const store = tempStore();
  const run = runWith(store);
  for (const name of ['Ada', 'Grace', 'Alan', 'Ada', 'Linus', 'Barbara', 'Ken', 'Grace', 'Dennis']) {
    run(name);
  }
  assert.equal(run('--recent'), 'Dennis\nGrace\nKen\nBarbara\nLinus\n');
});

test('--recent leaves the store bytes unchanged and greets nobody', () => {
  const store = tempStore();
  const run = runWith(store);
  run('Ada');
  run('Grace');
  const before = readFileSync(store);
  const first = run('--recent');
  const second = run('--recent');
  assert.equal(first, second);
  assert.doesNotMatch(first, /Hello/);
  assert.deepEqual(readFileSync(store), before);
});

test('--recent with no store prints the empty message and exits 0', () => {
  const store = tempStore();
  assert.equal(runWith(store)('--recent'), 'No names greeted yet.\n');
  assert.equal(existsSync(store), false);
});
