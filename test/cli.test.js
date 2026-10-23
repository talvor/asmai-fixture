import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const run = (...args) =>
  execFileSync(process.execPath, ['src/index.js', ...args], { encoding: 'utf8' });

test('prints the default greeting', () => {
  assert.equal(run(), 'Hello, Phillip!\n');
});

test('prints a greeting for a name argument', () => {
  assert.equal(run('asmai'), 'Hello, asmai!\n');
});

test('shouts the greeting for a name with --shout', () => {
  assert.equal(run('--shout', 'asmai'), 'HELLO, ASMAI!\n');
});

test('shouts the default greeting with --shout alone', () => {
  assert.equal(run('--shout'), 'HELLO, PHILLIP!\n');
});

test('accepts --shout after the name', () => {
  assert.equal(run('asmai', '--shout'), 'HELLO, ASMAI!\n');
});

test('prints usage naming --shout with --help and exits 0', () => {
  const usage = run('--help');
  assert.match(usage, /^Usage: /);
  assert.match(usage, /\[name\]/);
  assert.match(usage, /--shout\s+.*upper case/);
});
