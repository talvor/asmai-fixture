import { fileURLToPath } from 'node:url';

export function greet(name = 'world') {
  return `Hello, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(greet(process.argv[2]));
}
