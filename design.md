# Crab site design system

This document is the source of truth for the CrabPHP website and documentation.

The site reads like a plain text file in a terminal: one font, one size, a single column. Structure comes from Markdown-style marks and whitespace, not from type scale or decoration.

## Direction

- One typeface (JetBrains Mono), one size, one line height.
- Dark background, white text, amber for links and emphasis. Code blocks are the exception: syntax highlighting uses a small palette based on Pierre Dark.
- Headings are uppercase bold at body size, prefixed with `#`, `##`, `###`.
- No images, icons, gradients, shadows, cards, borders around content, or rounded corners.
- No frontend framework. Semantic HTML and one stylesheet: `public/assets/crab.css`.
- No JavaScript needed for anything.

## Tokens

```css
--bg: #111111;
--text: rgba(255, 255, 255, .88);   /* body */
--strong: #ffffff;                  /* headings, code, wordmark */
--amber: #f5b800;                   /* links, current page, selection, focus */
--muted: rgba(255, 255, 255, .62);  /* descriptions */
--faint: rgba(255, 255, 255, .5);   /* metadata, heading marks, comments */
--surface: rgba(255, 255, 255, .045); /* code blocks only */
--size: 13px;
--lh: 21px;
--measure: 680px;
```

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
- Tables have no rules. Headers are faint, numbers are right-aligned with tabular figures.
- Blockquotes (notes) have a 1px amber left rule.
- `hr` renders as `~*~`.
- The landing heading may end in a blinking amber cursor `█`; it only blinks when reduced motion is not requested.

## Components

- Header: wordmark `crab.` and a row of text links. It is as wide as the content under it: `--measure` on the landing page and the docs index, the docs columns on a docs page.
- Definition list `.defs`: term column plus description, for principles and commands.
- Benchmark table.
- Docs: a `22ch` sticky navigation column and a `--measure` content column. The columns are centered in the page together, not set against its left edge. Group labels are faint text, not headings. The current page has `aria-current="page"`, shows in amber, and is prefixed with `> `.
- On this page: the list of sections each page opens with, as a `details` (`+` / `−`). From `1280px` up it is a third, sticky `24ch` column on the right, always open.
- Below `860px` the navigation becomes a bar stuck to the top, `Docs / Page title`, that opens into a scrolling menu; it and On this page start closed. Both are open in the HTML and closed by a tiny inline script, so everything works without JavaScript.
- Below `560px` text goes to `14px / 22px`, code to `13px`, code blocks run to the screen edges, and every link is at least 28px tall.
- Pager: previous, source, next.
- Footer: one faint line framed by `~*~`.

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
- `public/assets/crab.css` is the only stylesheet; `public/assets/fonts/` holds the fonts and licence. Both are copied as they are and cached forever; pages link the stylesheet as `crab.css?v=<hash of its content>` (written by `render-docs.mjs` and by a Vite hook for `index.html`), so a change gets a new URL.
- `scripts/sync-docs.mjs` copies Markdown from the framework repo into `public/content/docs/` (generated).
- `scripts/render-docs.mjs` renders it into `public/docs/` (generated), with GitHub-style heading ids so the Markdown's anchors work. It also writes `public/llms.txt` (an index of the Markdown pages for agents) and `public/llms-full.txt` (the whole guide in one file), both generated.
- `scripts/highlight.mjs` supplies the shared highlighter. The Markdown renderer calls it for fenced and indented blocks; a Vite HTML hook highlights language-tagged landing-page blocks in development and production.
- Update this document before adding a colour, a size, or a new layout pattern.
