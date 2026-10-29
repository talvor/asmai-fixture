import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function storePath() {
  return process.env.ASMAI_FIXTURE_STORE || join(homedir(), '.asmai-fixture.json');
}

// The store is an ordered list of { name, greetedAt }, oldest first.
// A missing store means no one has been greeted yet.
export function readGreetings(path = storePath()) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function rememberGreeting(name, path = storePath(), now = new Date()) {
  const entries = readGreetings(path);
  entries.push({ name, greetedAt: now.toISOString() });
  writeFileSync(path, JSON.stringify(entries, null, 2) + '\n');
}

export const RECENT_LIMIT = 5;

// The most recent distinct names, newest first. A name greeted again appears
// once, at its latest greeting. Reads only: the store is never written here.
export function recentNames(path = storePath(), limit = RECENT_LIMIT) {
  const names = readGreetings(path).map((entry) => entry.name).reverse();
  return [...new Set(names)].slice(0, limit);
}
