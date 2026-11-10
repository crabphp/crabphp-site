import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import { highlightCodeBlocks } from './scripts/highlight.mjs';

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

function generatedDirectoryPages() {
  return {
    name: 'generated-directory-pages',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') return next();

        const pathname = new URL(request.url, 'http://localhost').pathname;
        // Let Vite transform the landing page (including syntax highlighting).
        if (pathname === '/' || !pathname.endsWith('/')) return next();

        const publicFile = join(process.cwd(), 'public', pathname, 'index.html');
        const sourceFile = join(process.cwd(), pathname, 'index.html');
        const file = existsSync(publicFile) ? publicFile : sourceFile;
        if (!existsSync(file)) return next();

        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=UTF-8');
        if (request.method === 'HEAD') return response.end();
        createReadStream(file).pipe(response);
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [generatedDirectoryPages(), highlightedCodeExamples(), versionedStylesheet()],
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
