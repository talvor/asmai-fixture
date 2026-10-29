import { fileURLToPath } from 'node:url';
import { rememberGreeting, recentNames, DamagedStoreError, UnwritableStoreError } from './store.js';

export const DEFAULT_NAME = 'Phillip';

export function greet(name = DEFAULT_NAME) {
  return `Hello, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--recent') {
    try {
      const names = recentNames();
      console.log(names.length ? names.join('\n') : 'No names greeted yet.');
    } catch (error) {
      if (!(error instanceof DamagedStoreError)) throw error;
      console.error(`Warning: cannot list recent names: ${error.message}.`);
      process.exitCode = 1;
    }
  } else {
    const name = arg ?? DEFAULT_NAME;
    console.log(greet(name));
    try {
      rememberGreeting(name);
    } catch (error) {
      if (!(error instanceof DamagedStoreError || error instanceof UnwritableStoreError)) throw error;
      console.error(`Warning: ${name} was not remembered: ${error.message}.`);
    }
  }
}
