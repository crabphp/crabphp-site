import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, renderPage, shell } from './page.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(siteRoot, 'public', 'content', 'docs');
const publicDocsRoot = join(siteRoot, 'public', 'docs');
const pageUrl = (file, anchor = '') => `/docs/${file.replace(/\.md$/, '')}/${anchor}`;

const menu = await readFile(join(sourceRoot, 'documentation.md'), 'utf8');
const groups = [];
let group = null;
for (const line of menu.split('\n')) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    group = { title: heading[1], pages: [] };
    groups.push(group);
    continue;
  }
  const localPage = line.match(/^- \[([^\]]+)\]\(([^)#]+\.md)\)/);
  const externalPage = line.match(/^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  if (localPage && group) group.pages.push({ title: localPage[1], file: localPage[2], external: false });
  if (externalPage && group) group.pages.push({ title: externalPage[1], href: externalPage[2], external: true });
}

await rm(publicDocsRoot, { recursive: true, force: true });
await mkdir(publicDocsRoot, { recursive: true });

const nav = (current = null) => groups.map(({ title, pages }) => `<div><p>${escapeHtml(title)}</p><ul>${pages.map((page) => {
  const href = page.external ? page.href : pageUrl(page.file);
  const here = !page.external && page.file === current ? ' aria-current="page"' : '';
  const mark = page.external ? ' <span aria-hidden="true">↗</span>' : '';
  return `<li><a href="${href}"${here}>${escapeHtml(page.title)}${mark}</a></li>`;
}).join('')}</ul></div>`).join('');

const index = groups.map(({ title, pages }) => `<h2>${escapeHtml(title)}</h2><ul>${pages.map((page) => `<li><a href="${page.external ? page.href : pageUrl(page.file)}">${escapeHtml(page.title)}</a>${page.external ? ' <span aria-hidden="true">↗</span>' : ''}</li>`).join('')}</ul>`).join('');
const docsIndexBody = `<main id="main" class="page">
  <h1>Documentation</h1>
  <p class="lede">Crab is a minimal PHP framework for JSON APIs and services. It gives a long-lived application routing, typed actions, validation, databases, queues, authentication and streaming. Start with installation, then follow the links as your application grows.</p>
  <p class="muted"><a href="/docs/views/">Views with Arc</a> are experimental, may change without backward compatibility, and must not be used in production.</p>
  ${index}
</main>`;
await writeFile(join(publicDocsRoot, 'index.html'), shell('Documentation', docsIndexBody, 'page'));

const localPages = groups.flatMap((group) => group.pages).filter((page) => !page.external);
for (const [position, page] of localPages.entries()) {
  const file = page.file.replace(/\.md$/, '');
  const markdown = await readFile(join(sourceRoot, page.file), 'utf8');
  const previous = localPages[position - 1];
  const next = localPages[position + 1];
  const pager = `<nav class="pager" aria-label="Previous and next page">${previous ? `<a href="${pageUrl(previous.file)}" rel="prev">← ${escapeHtml(previous.title)}</a>` : '<span></span>'}<a href="https://github.com/crabphp/framework/tree/main/docs/${page.file}">Source <span aria-hidden="true">↗</span></a>${next ? `<a href="${pageUrl(next.file)}" rel="next">${escapeHtml(next.title)} →</a>` : '<span></span>'}</nav>`;
  const html = `<div class="docs">
  <details class="docs-nav" data-collapse open>
    <summary><span>Docs</span> / ${escapeHtml(page.title)}</summary>
    <nav aria-label="Documentation pages">${nav(page.file)}</nav>
  </details>
  <main id="main" class="doc">${renderPage(markdown)}${pager}</main>
</div>`;
  await mkdir(join(publicDocsRoot, file), { recursive: true });
  await writeFile(join(publicDocsRoot, file, 'index.html'), shell(page.title, html, 'docs-width'));
}

const siteUrl = (process.env.SITE_URL || 'https://crab.daudau.cc').replace(/\/$/, '');

const llmsIndex = [
  '# Crab',
  '',
  '> A minimal PHP framework for JSON APIs and services. The application runs as a long-lived server: explicit types, no hidden state, one way to do each thing.',
  '',
  'Arc and its HTML views integration are experimental, may change without backward compatibility, and must not be used in production.',
  '',
  'In a Crab application, run `php cua describe` to read every route, command, scheduled task, listener, database and setting before reading files (`--json` for JSON Schema). The app\'s `AGENTS.md` has the conventions, and the guide is also in `vendor/crabphp/framework/docs/`.',
  '',
  ...groups.flatMap(({ title, pages }) => [
    `## ${title}`,
    '',
    ...pages.map((page) => page.external
      ? `- [${page.title}](${page.href})`
      : `- [${page.title}](${siteUrl}/content/docs/${page.file})`),
    '',
  ]),
  `The whole guide in one file: ${siteUrl}/llms-full.txt`,
  '',
].join('\n');
await writeFile(join(siteRoot, 'public', 'llms.txt'), llmsIndex);

const fullGuide = [];
for (const page of localPages) {
  fullGuide.push((await readFile(join(sourceRoot, page.file), 'utf8')).trim());
}
await writeFile(join(siteRoot, 'public', 'llms-full.txt'), `${fullGuide.join('\n\n---\n\n')}\n`);
const urls = [`${siteUrl}/`, `${siteUrl}/bia/`, `${siteUrl}/docs/`, `${siteUrl}/design/`, ...localPages.map((page) => `${siteUrl}${pageUrl(page.file)}`)];
await writeFile(join(siteRoot, 'public', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile(join(siteRoot, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
console.log(`Rendered ${localPages.length} static documentation pages`);
