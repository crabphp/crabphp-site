import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { highlightCodeBlocks } from './scripts/highlight.mjs';
import { addBenchmarkPings } from './scripts/benchmark-pings.mjs';

// Same versioned stylesheet URL as scripts/render-docs.mjs writes into the docs pages.
function versionedStylesheet() {
  return {
    name: 'versioned-stylesheet',
    transformIndexHtml(html) {
      const hash = createHash('sha256').update(readFileSync(join(process.cwd(), 'public', 'assets', 'crab.css'))).digest('hex').slice(0, 10);
      return html.replace('href="/assets/crab.css"', `href="/assets/crab.css?v=${hash}"`);
    },
  };
}

function highlightedCodeExamples() {
  return {
    name: 'highlighted-code-examples',
    transformIndexHtml: highlightCodeBlocks,
  };
}

function benchmarkPings() {
  return {
    name: 'benchmark-pings',
    transformIndexHtml: addBenchmarkPings,
  };
}

export function generatedDirectoryPages() {
  const middleware = (roots) => (request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();

    const url = new URL(request.url, 'http://localhost');
    const { pathname } = url;
    // Let Vite transform the landing page (including syntax highlighting).
    if (pathname === '/') return next();

    const file = roots.map((root) => join(root, pathname, 'index.html')).find(existsSync);
    if (!file) return next();
    if (!pathname.endsWith('/')) {
      response.statusCode = 301;
      response.setHeader('Location', `${pathname}/${url.search}`);
      return response.end();
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/html; charset=UTF-8');
    if (request.method === 'HEAD') return response.end();
    createReadStream(file).pipe(response);
  };
  return {
    name: 'generated-directory-pages',
    configureServer(server) {
      server.middlewares.use(middleware([server.config.publicDir, server.config.root]));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware([resolve(server.config.root, server.config.build.outDir)]));
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [generatedDirectoryPages(), highlightedCodeExamples(), benchmarkPings(), versionedStylesheet()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: 'index.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
