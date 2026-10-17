import { fileURLToPath } from 'node:url';

export function greet(name = 'Phillip') {
  return `Hello, ${name}!`;
}

export function farewell(name = 'world') {
  return `Goodbye, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(greet(process.argv[2]));
}
