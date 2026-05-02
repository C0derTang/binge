import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const extensionDir = resolve(scriptDir, '..');
const distDir = resolve(extensionDir, 'dist');

mkdirSync(distDir, { recursive: true });

for (const file of ['manifest.json', 'background.js', 'content.js']) {
  copyFileSync(resolve(extensionDir, file), resolve(distDir, file));
}
