import { fileURLToPath } from 'node:url';
import { rememberGreeting, recentNames } from './store.js';

export const DEFAULT_NAME = 'Phillip';

export function greet(name = DEFAULT_NAME) {
  return `Hello, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--recent') {
    const names = recentNames();
    console.log(names.length ? names.join('\n') : 'No names greeted yet.');
  } else {
    const name = arg ?? DEFAULT_NAME;
    console.log(greet(name));
    rememberGreeting(name);
  }
}
