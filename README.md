# CrabPHP site

The static CrabPHP landing page and documentation site.

## Development

From this directory:

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. Vite syncs and statically renders the framework documentation before starting, then serves the same directory structure used by production.

## Build

```sh
npm run build
npm run preview
```

The production files are written to `dist/` and can be deployed to Cloudflare Pages, Netlify, GitHub Pages, or any static host. `npm run dev` starts Vite with the same generated static documentation, so local development matches production.

## Documentation sync

`npm run sync:docs` copies Markdown documentation from the sibling `framework/docs/` directory into `public/content/docs/` and generates `public/content/docs.json` from `documentation.md`. `npm run render:docs` converts those Markdown pages into static HTML under `public/docs/`. The browser does not need a Markdown parser or documentation JavaScript in production.

The framework repository remains the source of truth for technical documentation. The site repository owns the presentation, landing-page content, and design system.

If the site repository is checked out alone, the sync script fetches documentation from `https://github.com/crabphp/framework` at `main`. For a pinned or private source, set `CRABPHP_FRAMEWORK_PATH`, `CRABPHP_FRAMEWORK_REPO`, and optionally `CRABPHP_FRAMEWORK_REF` before syncing. The default local layout is:

```text
crabphp/
├── framework/
└── crabphp-site/
```

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
