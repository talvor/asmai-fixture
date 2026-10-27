import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/index.js';

test('greets Phillip by default', () => {
  assert.equal(greet(), 'Hello, Phillip!');
});

test('greets a given name', () => {
  assert.equal(greet('asmai'), 'Hello, asmai!');
});

test('greets a given name with a given greeting word', () => {
  assert.equal(greet('Ada', 'Hi'), 'Hi, Ada!');
});

test('greets Phillip by default with a given greeting word', () => {
  assert.equal(greet(undefined, 'Hi'), 'Hi, Phillip!');
});
