import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { highlightCode } from './highlight.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// A stylesheet URL that changes with its content, so new pages never get an old cached copy.
const cssHash = createHash('sha256').update(await readFile(join(siteRoot, 'public', 'assets', 'crab.css'))).digest('hex').slice(0, 10);
const cssUrl = `/assets/crab.css?v=${cssHash}`;
const sourceRoot = join(siteRoot, 'public', 'content', 'docs');
const publicDocsRoot = join(siteRoot, 'public', 'docs');
const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const pageUrl = (file, anchor = '') => `/docs/${file.replace(/\.md$/, '')}/${anchor}`;

// Only rewrite rendered anchors, never href="…" text inside a code example.
const rewriteLinks = (html) => html.replace(/<a href="([a-z0-9-]+)\.md(#[^"]*)?"/g, (_, file, anchor = '') => `<a href="${pageUrl(file, anchor)}"`);

// GitHub-style heading ids, so the Markdown's own #anchors work on the site.
let seenSlugs = new Map();
const slug = (text) => {
  const base = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
  const count = seenSlugs.get(base) ?? 0;
  seenSlugs.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};
marked.use({
  renderer: {
    code({ text, lang }) {
      return `${highlightCode(text.replace(/\n$/, '') + '\n', lang)}\n`;
    },
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      return `<h${depth} id="${slug(html)}">${html}</h${depth}>\n`;
    },
  },
});

const render = (markdown) => {
  seenSlugs = new Map();
  return rewriteLinks(marked.parse(markdown));
};

// Navigation and "On this page" are open in the HTML, so they work without JavaScript.
// On a narrow screen this closes them before the first paint and keeps them in step on resize.
// It runs right after the last of them, before the page content is parsed.
const collapseScript = `<script>(() => { const narrow = matchMedia('(max-width: 860px)'); const sync = () => { for (const d of document.querySelectorAll('details[data-collapse]')) d.open = !narrow.matches; }; sync(); narrow.addEventListener('change', sync); })();</script>`;

// Every page opens with "# Title" and a list of links to its sections.
// That list becomes a collapsible "On this page", which a wide screen keeps in a column on the right.
const renderPage = (markdown) => {
  const opening = markdown.match(/^(# .+\n)\s*\n((?:[ \t]*- \[.+\n)+)/);
  if (!opening) return collapseScript + render(markdown);
  seenSlugs = new Map();
  const title = marked.parse(opening[1]);
  const toc = rewriteLinks(marked.parse(opening[2]));
  const rest = rewriteLinks(marked.parse(markdown.slice(opening[0].length)));
  return `${title}<aside class="toc-rail"><details class="toc" data-collapse open><summary>On this page</summary>${toc}</details></aside>${collapseScript}${rest}`;
};

// `width` is the class that gives the header the width of the content under it.
const shell = (title, body, width, description = 'Crab framework documentation for PHP web applications and JSON APIs.') => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111111">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} · Crab</title>
  <link rel="preload" href="/assets/fonts/JetBrainsMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${cssUrl}">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header ${width}">
    <a class="wordmark" href="/" aria-label="Crab home">crab<span>.</span></a>
    <nav aria-label="Site navigation"><a href="/">Home</a><a href="/docs/">Docs</a><a href="https://github.com/crabphp/framework">GitHub <span aria-hidden="true">↗</span></a></nav>
  </header>
  ${body}
</body>
</html>
`;

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
  <p class="lede">Crab is a minimal PHP framework for web applications and JSON APIs. It gives a long-lived application routing, typed actions, validation, databases, queues, authentication and streaming. Arc adds server-rendered HTML views, layouts and components as an optional package. Start with installation, then follow the links as your application grows.</p>
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
  '> A minimal PHP framework for web applications and JSON APIs, with server-rendered HTML views and components through the optional Arc package. The application runs as a long-lived server: explicit types, no hidden state, one way to do each thing.',
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
const urls = [`${siteUrl}/`, `${siteUrl}/docs/`, ...localPages.map((page) => `${siteUrl}${pageUrl(page.file)}`)];
await writeFile(join(siteRoot, 'public', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile(join(siteRoot, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
console.log(`Rendered ${localPages.length} static documentation pages`);
