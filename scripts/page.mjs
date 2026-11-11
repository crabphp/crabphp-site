import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';
import { highlightCode } from './highlight.mjs';

// All generated pages use the real stylesheet and invalidate its cache together.
const cssHash = createHash('sha256').update(await readFile(new URL('../public/assets/crab.css', import.meta.url))).digest('hex').slice(0, 10);
const cssUrl = `/assets/crab.css?v=${cssHash}`;
export const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// Only rewrite rendered anchors, never href="…" text inside a code example.
const rewriteLinks = (html) => html.replace(/<a href="([a-z0-9-]+)\.md(#[^"]*)?"/g, (_, file, anchor = '') => `<a href="/docs/${file}/${anchor}"`);

// GitHub-style heading ids, so the Markdown's own #anchors work on the site.
let seenSlugs = new Map();
const slug = (text) => {
  const base = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
  const count = seenSlugs.get(base) ?? 0;
  seenSlugs.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};
const markdown = new Marked({
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

export function renderMarkdown(source) {
  seenSlugs = new Map();
  return rewriteLinks(markdown.parse(source));
}

// Open in the HTML so documentation navigation works without JavaScript.
const collapseScript = `<script>(() => { const narrow = matchMedia('(max-width: 860px)'); const sync = () => { for (const d of document.querySelectorAll('details[data-collapse]')) d.open = !narrow.matches; }; sync(); narrow.addEventListener('change', sync); })();</script>`;

export function renderPage(source) {
  const opening = source.match(/^(# .+\n)\s*\n((?:[ \t]*- \[.+\n)+)/);
  if (!opening) return collapseScript + renderMarkdown(source);
  seenSlugs = new Map();
  const title = markdown.parse(opening[1]);
  const toc = rewriteLinks(markdown.parse(opening[2]));
  const rest = rewriteLinks(markdown.parse(source.slice(opening[0].length)));
  return `${title}<aside class="toc-rail"><details class="toc" data-collapse open><summary>On this page</summary>${toc}</details></aside>${collapseScript}${rest}`;
}

// `width` matches the header and footer to the content under them.
export const shell = (title, body, width, description = 'Crab framework documentation for PHP web applications and JSON APIs.') => `<!doctype html>
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
  <footer class="site-footer ${width}">
    <p>~*~ crab · MIT licensed · PHP · <a href="/design/">Design</a> · <a href="https://github.com/crabphp">github.com/crabphp <span aria-hidden="true">↗</span></a> ~*~</p>
  </footer>
</body>
</html>
`;
