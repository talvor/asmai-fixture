import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Greeting now writes to the store, so point it at a temp file, never the home directory.
const run = (...args) =>
  execFileSync(process.execPath, ['src/index.js', ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ASMAI_FIXTURE_STORE: join(mkdtempSync(join(tmpdir(), 'asmai-fixture-')), 'store.json'),
    },
  });

test('prints the default greeting', () => {
  assert.equal(run(), 'Hello, Phillip!\n');
});

test('prints a greeting for a name argument', () => {
  assert.equal(run('asmai'), 'Hello, asmai!\n');
});
