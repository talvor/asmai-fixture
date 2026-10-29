import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each test gets its own store, so no test ever touches ~/.asmai-fixture.json.
const tempStore = () => join(mkdtempSync(join(tmpdir(), 'asmai-fixture-')), 'store.json');

const run = (store, ...args) =>
  spawnSync(process.execPath, ['src/index.js', ...args], {
    encoding: 'utf8',
    env: { ...process.env, ASMAI_FIXTURE_STORE: store },
  });

const blankNames = { empty: '', 'whitespace-only': '   ' };

for (const [kind, name] of Object.entries(blankNames)) {
  test(`an ${kind} name is rejected with one error line, exit 1 and no store created`, () => {
    const store = tempStore();
    const result = run(store, name);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Error: name must not be blank\n');
    assert.equal(existsSync(store), false);
  });

  test(`an ${kind} name leaves an existing store unchanged`, () => {
    const store = tempStore();
    const contents = '[\n  { "name": "Ada", "greetedAt": "2026-10-29T00:00:00.000Z" }\n]\n';
    writeFileSync(store, contents);
    const result = run(store, name);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Error: name must not be blank\n');
    assert.equal(readFileSync(store, 'utf8'), contents);
  });
}

test('a name with surrounding whitespace is greeted and remembered trimmed', () => {
  const store = tempStore();
  const result = run(store, ' Ada ');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Hello, Ada!\n');
  assert.equal(result.stderr, '');
  assert.deepEqual(
    JSON.parse(readFileSync(store, 'utf8')).map((entry) => entry.name),
    ['Ada'],
  );
});

// Oldest first, as the store keeps them. Newest first, the real names are
// Grace, Ada (twice, once padded), Linus, Alan, Barbara, Ken, Edsger.
const seededStore =
  JSON.stringify(
    [
      { name: 'Edsger', greetedAt: '2026-10-29T00:00:00.000Z' },
      { name: 'Ken', greetedAt: '2026-10-29T00:01:00.000Z' },
      { name: 'Barbara', greetedAt: '2026-10-29T00:02:00.000Z' },
      { name: '', greetedAt: '2026-10-29T00:03:00.000Z' },
      { name: 'Alan', greetedAt: '2026-10-29T00:04:00.000Z' },
      { name: '   ', greetedAt: '2026-10-29T00:05:00.000Z' },
      { name: 'Linus', greetedAt: '2026-10-29T00:06:00.000Z' },
      { name: 'Ada', greetedAt: '2026-10-29T00:07:00.000Z' },
      { name: '\t', greetedAt: '2026-10-29T00:08:00.000Z' },
      { name: ' Ada ', greetedAt: '2026-10-29T00:09:00.000Z' },
      { name: 'Grace', greetedAt: '2026-10-29T00:10:00.000Z' },
      { name: '  ', greetedAt: '2026-10-29T00:11:00.000Z' },
    ],
    null,
    2,
  ) + '\n';

test('--recent skips blank names, lists padded names once trimmed and fills 5 slots with real names', () => {
  const store = tempStore();
  writeFileSync(store, seededStore);
  const result = run(store, '--recent');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'Grace\nAda\nLinus\nAlan\nBarbara\n');
  assert.equal(readFileSync(store, 'utf8'), seededStore);
});

test('--recent with only blank names stored lists no one and leaves the store unchanged', () => {
  const store = tempStore();
  const contents = JSON.stringify([
    { name: '', greetedAt: '2026-10-29T00:00:00.000Z' },
    { name: '   ', greetedAt: '2026-10-29T00:01:00.000Z' },
  ]);
  writeFileSync(store, contents);
  const result = run(store, '--recent');
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'No names greeted yet.\n');
  assert.equal(readFileSync(store, 'utf8'), contents);
});
