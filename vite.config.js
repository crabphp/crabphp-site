import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';

function generatedDirectoryPages() {
  return {
    name: 'generated-directory-pages',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') return next();

        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (!pathname.endsWith('/')) return next();

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
  plugins: [generatedDirectoryPages()],
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
