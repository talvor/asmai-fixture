import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function storePath() {
  return process.env.ASMAI_FIXTURE_STORE || join(homedir(), '.asmai-fixture.json');
}

// A store that exists but cannot be read, or is not a list of greetings.
export class DamagedStoreError extends Error {
  constructor(path, reason) {
    super(`the store at ${path} is damaged (${reason})`);
    this.name = 'DamagedStoreError';
  }
}

// A store that cannot be written, such as one in a missing or read-only place.
export class UnwritableStoreError extends Error {
  constructor(path, reason) {
    super(`the store at ${path} cannot be written (${reason})`);
    this.name = 'UnwritableStoreError';
  }
}

const isGreeting = (entry) =>
  entry !== null && typeof entry === 'object' && typeof entry.name === 'string' && typeof entry.greetedAt === 'string';

// The store is an ordered list of { name, greetedAt }, oldest first.
// A missing store means no one has been greeted yet; a damaged one throws DamagedStoreError.
export function readGreetings(path = storePath()) {
  if (!existsSync(path)) return [];
  let entries;
  try {
    entries = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new DamagedStoreError(path, error instanceof SyntaxError ? 'invalid JSON' : error.code ?? error.message);
  }
  if (!Array.isArray(entries) || !entries.every(isGreeting)) {
    throw new DamagedStoreError(path, 'not a list of greetings');
  }
  return entries;
}

export function rememberGreeting(name, path = storePath(), now = new Date()) {
  const entries = readGreetings(path);
  entries.push({ name, greetedAt: now.toISOString() });
  try {
    writeFileSync(path, JSON.stringify(entries, null, 2) + '\n');
  } catch (error) {
    throw new UnwritableStoreError(path, error.code ?? error.message);
  }
}

export const RECENT_LIMIT = 5;

// The most recent distinct names, newest first. A name greeted again appears
// once, at its latest greeting. Reads only: the store is never written here.
export function recentNames(path = storePath(), limit = RECENT_LIMIT) {
  const names = readGreetings(path).map((entry) => entry.name).reverse();
  return [...new Set(names)].slice(0, limit);
}
