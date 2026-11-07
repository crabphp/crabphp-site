# Crab site design system

This document is the source of truth for the CrabPHP website and documentation.

The site reads like a plain text file in a terminal: one font, one size, a single column. Structure comes from Markdown-style marks and whitespace, not from type scale or decoration.

## Direction

- One typeface (JetBrains Mono), one size, one line height.
- Dark background, white text, amber for links and emphasis.
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

`--faint` is the lowest opacity allowed for text, which keeps contrast at or above WCAG AA. Do not add hues: meaning comes from words and structure.

## Rhythm

All vertical spacing is a multiple of `--lh`:

- `1 × --lh` after paragraphs, lists, code blocks, and tables.
- `2 × --lh` before `##` and deeper headings.
- `3 × --lh` between landing-page sections and before the pager.

The page has `40px` padding (`24px 16px` on small screens) and is left-aligned, not centered.

## Text elements

- Links: amber, underlined on hover. External links end with `↗`, directional links with `→` or `←`, both wrapped in `aria-hidden="true"`.
- Lists use `- ` markers in faint white.
- Inline code is white with no background. Code blocks use `--surface` and the same size as body text.
- Syntax colour is sparse: amber for keywords and strings, faint for comments, white for everything else.
- Tables have no rules. Headers are faint, numbers are right-aligned with tabular figures.
- Blockquotes (notes) have a 1px amber left rule.
- `hr` renders as `~*~`.
- The landing heading may end in a blinking amber cursor `█`; it only blinks when reduced motion is not requested.

## Components

- Header: wordmark `crab.` and a row of text links.
- Definition list `.defs`: term column plus description, for principles and commands.
- Benchmark table.
- Docs: a `22ch` sticky navigation column and a `--measure` content column. Group labels are faint text, not headings. The current page has `aria-current="page"`, shows in amber, and is prefixed with `> `. Below `860px` the nav moves above the content in columns.
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
- `public/assets/crab.css` is the only stylesheet; `public/assets/fonts/` holds the fonts and licence. Both are copied as they are, so `_headers` caches the fonts forever and the stylesheet for an hour.
- `scripts/sync-docs.mjs` copies Markdown from the framework repo into `public/content/docs/` (generated).
- `scripts/render-docs.mjs` renders it into `public/docs/` (generated), with GitHub-style heading ids so the Markdown's anchors work. It also writes `public/llms.txt` (an index of the Markdown pages for agents) and `public/llms-full.txt` (the whole guide in one file), both generated.
- Update this document before adding a colour, a size, or a new layout pattern.
