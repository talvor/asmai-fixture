import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet, farewell } from '../src/index.js';

test('greets the world by default', () => {
  assert.equal(greet(), 'Hello, world!');
});

test('greets a given name', () => {
  assert.equal(greet('asmai'), 'Hello, asmai!');
});

test('bids the world farewell by default', () => {
  assert.equal(farewell(), 'Goodbye, world!');
});

test('bids a given name farewell', () => {
  assert.equal(farewell('asmai'), 'Goodbye, asmai!');
});
