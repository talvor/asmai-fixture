import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export function greet(name = 'Phillip') {
  return `Hello, ${name}!`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    options: { shout: { type: 'boolean' }, help: { type: 'boolean' } },
    allowPositionals: true,
  });
  if (values.help) {
    console.log(`Usage: node src/index.js [name] [--shout]

Prints a greeting for name (default: Phillip).

Options:
  --shout  print the greeting in upper case
  --help   show this help and exit`);
    process.exit(0);
  }
  const greeting = greet(positionals[0]);
  console.log(values.shout ? greeting.toUpperCase() : greeting);
}
