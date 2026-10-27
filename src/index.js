import { fileURLToPath } from 'node:url';

export function greet(name = 'Phillip', greeting = 'Hello') {
  return `${greeting}, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(greet(process.argv[2]));
}
