import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { generatedDirectoryPages } from '../vite.config.js';

for (const hook of ['configureServer', 'configurePreviewServer']) {
  test(`${hook} serves generated design pages instead of the landing-page fallback`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'crab-site-directory-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const directory of ['public', 'dist']) {
      await mkdir(join(root, directory, 'design'), { recursive: true });
      await writeFile(join(root, directory, 'design/index.html'), `<h1>${directory} design system</h1>`);
    }
    let middleware;
    generatedDirectoryPages()[hook]({
      config: { root, publicDir: join(root, 'public'), build: { outDir: 'dist' } },
      middlewares: { use(handler) { middleware = handler; } },
    });
    const server = createServer((request, response) => middleware(request, response, () => {
      response.statusCode = 404;
      response.end('Vite handles this');
    }));
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    t.after(() => new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => error ? reject(error) : resolve());
    }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const redirect = await fetch(`${base}/design?preview=1`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/design/?preview=1');
    const page = await fetch(`${base}/design/`);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('content-type'), 'text/html; charset=UTF-8');
    assert.equal(await page.text(), `<h1>${hook === 'configureServer' ? 'public' : 'dist'} design system</h1>`);
    const head = await fetch(`${base}/design/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    for (const path of ['/', '/missing/', '/assets/crab.css']) {
      assert.equal((await fetch(base + path)).status, 404, 'Unrelated requests are left to Vite');
    }
    assert.equal((await fetch(`${base}/design/`, { method: 'POST' })).status, 404);
  });
}
