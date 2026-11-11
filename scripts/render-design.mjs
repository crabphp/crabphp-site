import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { escapeHtml, renderMarkdown, shell } from './page.mjs';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('design.md', root), 'utf8');
const css = await readFile(new URL('public/assets/crab.css', root), 'utf8');
const baseTokens = css.match(/:root\s*\{([^}]+)\}/)?.[1];
if (!baseTokens) throw new Error('Missing :root design tokens in crab.css');
const tokens = [...baseTokens.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)];
if (!tokens.length) throw new Error('No design tokens found in crab.css');
const tokenTable = `<table>
  <caption>Current base tokens from the shared stylesheet.</caption>
  <thead><tr><th scope="col">Token</th><th scope="col">Value</th></tr></thead>
  <tbody>${tokens.map(([, name, value]) => `<tr><th scope="row"><code>${escapeHtml(name)}</code></th><td><code>${escapeHtml(value.trim())}</code></td></tr>`).join('')}</tbody>
</table>`;
const marker = '<!-- design:tokens -->';
if (source.split(marker).length !== 2) throw new Error('design.md must contain exactly one design:tokens marker');
const body = `<main id="main" class="page doc">${renderMarkdown(source.replace(marker, tokenTable))}</main>`;
const html = shell('Design system', body, 'page', 'The CrabPHP design system: live HTML specimens, design tokens, typography, components and accessibility rules.');

await mkdir(new URL('public/design/', root), { recursive: true });
await mkdir(new URL('public/content/', root), { recursive: true });
await writeFile(new URL('public/design/index.html', root), html);
await writeFile(new URL('public/content/design.md', root), source);
console.log('Rendered /design/ from design.md and the shared stylesheet');
