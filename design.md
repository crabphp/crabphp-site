# Crab site design system

This document is the source of truth for the CrabPHP website and documentation.

The site reads like a plain text file in a terminal: one font, one size, a single column. Structure comes from Markdown-style marks and whitespace, not from type scale or decoration.

[Markdown source](/content/design.md) · [Edit on GitHub](https://github.com/crabphp/crabphp-site/blob/main/design.md)

- [Live specimens](#live-specimens)
- [Direction](#direction)
- [Tokens](#tokens)
- [Rhythm](#rhythm)
- [Text elements](#text-elements)
- [Components](#components)
- [Accessibility](#accessibility)
- [Content voice](#content-voice)
- [Repository](#repository)

## Live specimens

These are real HTML elements using the website's stylesheet, not screenshots or a separate theme. The header and footer on this page are live components too. Changes to this document and the stylesheet appear here on the next build.

### Type and emphasis

<p class="lede">Lead copy introduces a page calmly, at the same size as everything else.</p>

Body text carries the detail. **Strong text** adds emphasis. Inline `code` names an API. [An internal link](#direction) leads to the design rules; an <a href="https://github.com/crabphp/crabphp-site">external link <span aria-hidden="true">↗</span></a> leads to the source.

<p class="muted">Muted text describes a feature without competing with it.</p>
<p class="faint">Faint text is for metadata, not the main thing you came to read.</p>

#### Heading marks, not a type scale

Headings keep the body size. Their marks, weight and spacing establish hierarchy.

### Lists and definitions

- Make state explicit.
- Keep one way to do each thing.
- Explain the trade-off.

1. Install the application.
2. Read its configuration.
3. Start the server.

<dl class="defs">
  <dt>Explicit</dt><dd>Names and types say what happens.</dd>
  <dt>Small</dt><dd>Compose the pieces you need.</dd>
  <dt>Readable</dt><dd>Leave room for the content.</dd>
</dl>

### Code and terminal output

Syntax colours belong inside code blocks. The same build-time highlighter renders these examples and the documentation.

```php
use Crab\Route;

Route::get('/hello/{name}', static function (string $name): array {
    return ['hello' => $name];
});
```

```text
$ php cua status
HTTP       running
Queue      running
Scheduler  running
```

### Tables and notes

<table>
  <caption>Example application state. Illustrative values, not benchmark results.</caption>
  <thead><tr><th scope="col">Worker</th><th scope="col">State</th><th scope="col" class="num">Handled</th></tr></thead>
  <tbody>
    <tr><th scope="row">HTTP</th><td>Running</td><td class="num">12,480</td></tr>
    <tr><th scope="row">Queue</th><td>Idle</td><td class="num">340</td></tr>
    <tr><th scope="row">Scheduler</th><td>Waiting</td><td class="num">24</td></tr>
  </tbody>
</table>

> Notes explain a constraint or a useful exception. A thin amber rule is enough; no card or extra colour is needed.

### Disclosure and navigation

<details>
  <summary>Open a plain HTML disclosure</summary>
  <p>The browser provides the interaction. No JavaScript is needed. Use Tab to focus the summary, then Enter or Space to open it.</p>
</details>

<nav class="pager" aria-label="Example page navigation">
  <a href="#live-specimens"><span aria-hidden="true">←</span> Specimens</a>
  <a href="/content/design.md">Source</a>
  <a href="#direction">Rules <span aria-hidden="true">→</span></a>
</nav>

### Motion and focus

<p>A cursor <span class="cursor" aria-hidden="true">█</span> blinks only when reduced motion is not requested. Nothing depends on the animation.</p>

Use Tab to move through this page's links and disclosure. The amber focus outline should stay visible. On a narrow screen, long code and tables scroll rather than shrinking the text.

---

## Direction

- One typeface (JetBrains Mono), one size, one line height.
- Dark background, white text, amber for links and emphasis. Code blocks are the exception: syntax highlighting uses a small palette based on Pierre Dark.
- Headings are uppercase bold at body size, prefixed with `#`, `##`, `###`.
- No images, icons, gradients, shadows, cards, or rounded corners. Borders are reserved for thin table grids and blockquote rules.
- No frontend framework. Semantic HTML and one stylesheet: `public/assets/crab.css`.
- No JavaScript needed for anything.

## Tokens

Tokens live in `:root` in `public/assets/crab.css`. The published table reads them directly from that stylesheet, so values are not maintained in two places. Responsive overrides are described below.

<!-- design:tokens -->

`--bg` is the page background; `--text` is body copy; `--strong` is headings and code. `--amber` marks links, selection and focus. `--muted` is for descriptions and `--faint` for metadata. `--line` draws table rules; `--surface` belongs only to code blocks.

`--faint` is the lowest opacity allowed for text, which keeps contrast at or above WCAG AA. Outside syntax-highlighted code, do not add hues: meaning comes from words and structure.

## Rhythm

All vertical spacing is a multiple of `--lh`:

- `1 × --lh` after paragraphs, lists, code blocks, and tables.
- `2 × --lh` before `##` and deeper headings.
- `3 × --lh` between landing-page sections and before the pager.

The page has `40px` padding (`24px 16px` on small screens) and a centered max-width container. Text inside the container remains left-aligned.

## Text elements

- Links: amber, underlined on hover. External links end with `↗`, directional links with `→` or `←`, both wrapped in `aria-hidden="true"`.
- Lists use `- ` markers in faint white.
- Inline code is white with no background. Code blocks use `--surface` and the same size as body text.
- Syntax highlighting uses the `@pierre/highlights` HTML API at build time, shared by Markdown docs and landing-page `<pre><code class="language-…">` examples. No highlighter JavaScript or WebAssembly is sent to the browser.
- Code-only palette, based on Pierre Dark: pink `#ff678d` keywords and tags, green `#5ecc71` strings, cyan `#68cdf2` numbers and constants, purple `#9d6afb` functions, magenta `#d568ea` types, orange `#ffa359` variables and properties, and cyan `#08c0ef` operators and escapes. Comments use `--faint`; punctuation and ordinary text stay white. The block background remains `--surface`. These colours are CSS variables scoped to `.highlights`.
- Plain text, terminal output, and unsupported languages render safely without syntax colours. Inline code and the mascot are not highlighted.
- Tables use a collapsed 1px grid in `--line`, with half a line of vertical padding and `2ch` horizontal padding in every cell. The landing benchmark table uses only horizontal row separators, with its outer content edges flush to the caption. Headers are faint, numbers are right-aligned with tabular figures. Captions remain outside the grid.
- Blockquotes (notes) have a 1px amber left rule.
- `hr` renders as `~*~`.
- The landing heading may end in a blinking amber cursor `█`; it only blinks when reduced motion is not requested.

## Components

- Header: wordmark `crab.` and a row of text links. It is as wide as the content under it: `--measure` on the landing page and the docs index, the docs columns on a docs page.
- Definition list `.defs`: term column plus description, for principles and commands.
- Benchmark table: framework/version and faint runtime sit on two lines. Below each Hello number, a `1px` track in `--line` spans the Hello cell's full content width and carries a `6px` square. Framework names and Database cells stay free of animation. No brackets or end caps. The square is faint white, or amber for Crab. All tracks have the same length. The fastest Hello result crosses in one second; every other duration is the fastest throughput divided by that row's Hello throughput, with linear back-and-forth motion that reverses at each end. Vite adds this decorative, screen-reader-hidden markup and a compact “Motion follows Hello.” caption note at build time, so regenerated benchmark sections need no animation metadata. There are no pause controls. Reduced-motion preferences leave the squares still and hide the motion note. No browser JavaScript.
- Docs: a `22ch` sticky navigation column and a `--measure` content column. The columns are centered in the page together, not set against its left edge. Group labels are faint text, not headings. The current page has `aria-current="page"`, shows in amber, and is prefixed with `> `.
- On this page: the list of sections each page opens with, as a `details` (`+` / `−`). From `1280px` up it is a third, sticky `24ch` column on the right, always open.
- Below `860px` the navigation becomes a bar stuck to the top, `Docs / Page title`, that opens into a scrolling menu; it and On this page start closed. Both are open in the HTML and closed by a tiny inline script, so everything works without JavaScript.
- Below `560px` text goes to `14px / 22px`, code to `13px`, code blocks run to the screen edges, and every link is at least 28px tall.
- Pager: previous, source, next.
- Footer: one faint line framed by `~*~`, with a `Design` link to `/design/` on the landing page, documentation and design reference.
- Design reference: a single-column page at `/design/`, rendered from this document. Specimens use the existing HTML elements and classes, not a second stylesheet or component library.

Add a component only when the same structure appears in more than one place.

## Accessibility

- Every page has a skip link to `#main` and exactly one `h1`.
- Focus is a `2px` amber outline with a `4px` offset.
- Code and tables scroll horizontally instead of shrinking.
- Motion (smooth scrolling, cursor blink) only runs under `prefers-reduced-motion: no-preference`.

## Content voice

Direct, calm, and specific. Short sentences. Explain why, not only what. No hype. Say what Crab does and what it deliberately does not do. “Crab” is the framework; “CrabPHP” is the wider project.

## Repository

- `index.html` is the landing page, built by Vite.
- `public/assets/crab.css` is the only stylesheet; `public/assets/fonts/` holds the fonts and licence. Both are copied as they are and cached forever; pages link the stylesheet as `crab.css?v=<hash of its content>` (written by `page.mjs` for generated pages and by a Vite hook for `index.html`), so a change gets a new URL.
- `scripts/sync-docs.mjs` copies Markdown from the framework repo into `public/content/docs/` (generated).
- `scripts/render-design.mjs` renders this document into `public/design/index.html` and copies its exact Markdown to `public/content/design.md` (both generated). `npm run dev` and `npm run build` run it automatically. The token table is generated from the real stylesheet, never from a copied palette.
- `scripts/page.mjs` shares the HTML shell, footer, versioned stylesheet URL and Markdown renderer between the documentation and design reference.
- `scripts/render-docs.mjs` renders the guide into `public/docs/` (generated), with GitHub-style heading ids so the Markdown's anchors work. The sitemap includes `/design/`. It also writes `public/llms.txt` (an index of the Markdown pages for agents) and `public/llms-full.txt` (the whole guide in one file), both generated.
- `scripts/highlight.mjs` supplies the shared highlighter. The Markdown renderer calls it for fenced and indented blocks; a Vite HTML hook highlights language-tagged landing-page blocks in development and production.
- Update this document before adding a colour, a size, or a new layout pattern.
