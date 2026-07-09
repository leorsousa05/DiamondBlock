import { cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'web', 'dist');
const dest = join(__dirname, '..', 'dist', 'web');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`✓ Copied web/dist → dist/web`);
