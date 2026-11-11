import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(siteRoot, process.env.CRABPHP_DESIGN_PATH || '../design');
const destination = join(siteRoot, 'public', 'design');
// Publish the existing showcase and its assets, not the repository or dev tools.
const files = ['index.html', 'design.md', 'LICENSE', 'css', 'demo', 'fonts', 'js'];

// Check the checkout before replacing any previously generated preview.
try {
  for (const file of files) await stat(join(source, file));
} catch (cause) {
  throw new Error(`Design source is missing or incomplete at ${source}. Clone crabphp/design to ../design or set CRABPHP_DESIGN_PATH.`, { cause });
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of files) await cp(join(source, file), join(destination, file), { recursive: true });
// Remove the former site-only Markdown preview if present from an earlier build.
await rm(join(siteRoot, 'public', 'content', 'design.md'), { force: true });
console.log(`Copied the crabphp/design showcase from ${source} to /design/`);
