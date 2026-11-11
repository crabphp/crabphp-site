# CrabPHP site

The static CrabPHP landing page and documentation site.

## Development

From this directory:

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. Vite syncs and statically renders the framework documentation and design reference before starting, then serves the same directory structure used by production.

## Build

```sh
npm run build
npm run preview
```

The production files are written to `dist/` and can be deployed to Cloudflare Pages, Netlify, GitHub Pages, or any static host. `npm run dev` starts Vite with the same generated static documentation, so local development matches production.

## Documentation sync

`npm run sync:docs` copies Markdown documentation from the sibling `framework/docs/` directory into `public/content/docs/` and generates `public/content/docs.json` from `documentation.md`. `npm run render:docs` converts those Markdown pages into static HTML under `public/docs/`. The browser does not need a Markdown parser or documentation JavaScript in production.

The framework repository remains the source of truth for technical documentation. The site repository owns its presentation, landing-page content and site-specific styling. The shared application design system lives in [crabphp/design](https://github.com/crabphp/design).

### Code highlighting

Documentation code blocks and landing-page examples use the [Highlights HTML API](https://diffs.com/docs#highlights-html) from `@pierre/highlights`. Highlighting runs during rendering/building (and in Vite's development HTML hook); no highlighter JavaScript or WebAssembly is shipped to the browser.

Use a language on Markdown fences, such as `php`, `sh`, or `json`. In `index.html`, use `<pre><code class="language-php">…</code></pre>` with HTML-escaped source, without manually adding token spans. Use `language-text` for terminal output. Missing or unsupported languages fall back to escaped plain text. Inline code and the mascot remain unchanged.

The shared theme lives in `scripts/highlight.mjs`; its code-only palette is in `public/assets/crab.css`. Run `npm test` for highlighting regression tests.

If the site repository is checked out alone, the sync script fetches documentation from `https://github.com/crabphp/framework` at `main`. For a pinned or private source, set `CRABPHP_FRAMEWORK_PATH`, `CRABPHP_FRAMEWORK_REPO`, and optionally `CRABPHP_FRAMEWORK_REF` before syncing. The default local layout is:

```text
crabphp/
├── framework/
└── crabphp-site/
```

## Design system

`/design/` is the landing page and interactive showcase from [crabphp/design](https://github.com/crabphp/design), copied unchanged—not a recreation of its documentation. Use the **Design** footer link to preview its tokens, components, charts and assembled application screens.

At build time, `npm run sync:design` copies that repo's `index.html`, `design.md`, licence, CSS, fonts, chart JavaScript and demo assets into `public/design/`. Their relative paths work under `/design/`. Vite copies them into `dist/design/`; the website does not fetch anything at runtime.

For local development, keep a sibling checkout:

```sh
git clone https://github.com/crabphp/design.git ../design
npm run dev
```

Or set `CRABPHP_DESIGN_PATH` to an existing checkout. Both `npm run dev` and `npm run build` run the copy automatically. To refresh an already running preview after editing the source, run `npm run sync:design`.

GitHub Actions checks out `crabphp/design` at `main` on every website build and supplies its path. Design repo changes appear on the **next website build**; use the deploy workflow's “Run workflow” button to refresh without a site code change. No cross-repo sync service is needed.

`public/design/` is generated and ignored by Git. Make design changes in `crabphp/design`, not in the copied files or this repo's site-specific `design.md`. The sitemap includes `/design/`, and Cloudflare Pages redirects `/design` to `/design/`.

## Cloudflare Pages

Use these settings when deploying:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Node version: `22` or newer

The generated site is fully static. No server-side runtime is required.

### Wrangler

After creating the Pages project once:

```sh
npm run deploy
```

The command uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment. Never put either secret in the repository.

### GitHub Actions

`.github/workflows/deploy.yml` builds on pushes to `main` and deploys `dist/` to the `crabphp-site` Pages project. Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare token only needs Pages deployment permission for this project/account. DNS and custom-domain configuration are separate operations and should not be done by the deployment workflow.

## Benchmark data

The landing-page table is generated from the independent public [crabphp/benchmarks](https://github.com/crabphp/benchmarks) repository. The seven framework rows retain reference run `20261110T104256Z`; ReactPHP and AMP use supplement `20261111T055316Z`. Both use PHP 8.5.12, five trials per published case, and zero errors. The table labels and links the separate measurement dates rather than implying a simultaneous comparison.

To update it from a new reference run:

```sh
python3 ../benchmarks/update-site.py ../benchmarks/results/<timestamp> --site .
```

The updater verifies every retained wrk result and recomputes the medians. It rejects smoke runs, missing trials and any errors. Keep the date, runtime versions, machine limitations and raw-results links with the table.

To add the two HTTP library rows without rerunning or replacing the existing framework measurements:

```sh
python3 ../benchmarks/add-libraries.py ../benchmarks/results/<library-timestamp> --baseline ../benchmarks/results/20261110T104256Z --site .
```

This requires an audited five-trial ReactPHP/AMP supplement for Hello and MySQL at 64 connections. It retains the existing seven rows, checks host/runtime compatibility, and labels and links the separate measurement dates. ReactPHP and AMP are HTTP libraries with routers, explicit validation and native async MySQL drivers, not full application frameworks.

Vite adds full-width animated tracks below the Hello numbers through `scripts/benchmark-pings.mjs`, deriving speeds directly from that column. Framework names and Database results stay free of animation. The fastest result takes one second per direction; the others take proportionally longer. The same transform adds the short motion note, so regenerating the benchmark section preserves the feature without manual markup. There are no pause controls. Motion is CSS-only and respects reduced-motion preferences.
