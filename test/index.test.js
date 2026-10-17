import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/index.js';

test('greets Phillip by default', () => {
  assert.equal(greet(), 'Hello, Phillip!');
});

test('greets a given name', () => {
  assert.equal(greet('asmai'), 'Hello, asmai!');
});
