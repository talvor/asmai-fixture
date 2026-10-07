import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/index.js';

test('greets the world by default', () => {
  assert.equal(greet(), 'Hello, world!');
});

test('greets a given name', () => {
  assert.equal(greet('asmai'), 'Hello, asmai!');
});
