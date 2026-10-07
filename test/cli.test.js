import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const run = (...args) =>
  execFileSync(process.execPath, ['src/index.js', ...args], { encoding: 'utf8' });

test('prints the default greeting', () => {
  assert.equal(run(), 'Hello, world!\n');
});

test('prints a greeting for a name argument', () => {
  assert.equal(run('asmai'), 'Hello, asmai!\n');
});
