import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'parse5';
import { build, createServer, preview } from 'vite';

const configFile = fileURLToPath(new URL('../vite.config.js', import.meta.url));
const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;

function checkBiaPage(html) {
  const tree = parse(html);
  assert.equal(findAll(tree, 'h1').length, 1);
  assert.match(textContent(findAll(tree, 'h1')[0]), /Bia — a coding agent for your terminal/);
  assert.equal(attr(findAll(tree, 'main')[0], 'id'), 'main');
  const links = findAll(tree, 'a');
  assert.ok(links.some((node) => attr(node, 'href') === '#main' && textContent(node) === 'Skip to content'));
  assert.ok(links.some((node) => attr(node, 'href') === '/bia/' && attr(node, 'aria-current') === 'page'));
  assert.ok(links.some((node) => attr(node, 'href') === 'https://github.com/crabphp/bia#from-source-with-composer'));
  for (const node of links) {
    const href = attr(node, 'href');
    assert.doesNotMatch(href, /\s/, 'Links contain no accidental whitespace');
    if (href.startsWith('#')) {
      assert.ok(html.includes(`id="${href.slice(1)}"`), `Missing anchor target: ${href}`);
    }
  }
  const code = findAll(tree, 'code').map(textContent);
  assert.ok(code.some((text) => text.includes('curl -fsSL https://raw.githubusercontent.com/crabphp/bia/main/install.sh | sh')));
  assert.ok(code.includes('bia init --global'));
  assert.ok(code.some((text) => text.includes("env('OPENAI_API_KEY')")));
  assert.match(textContent(tree), /Bia is not a sandbox/);
  assert.match(textContent(tree), /full permission by default/);
  assert.match(textContent(tree), /No fixed limit on model\/tool steps/);
  assert.match(textContent(tree), /not a live session/);
  assert.match(textContent(tree), /Linux and macOS, Intel or ARM; on Windows, use WSL/);
  assert.ok(links.some((node) => attr(node, 'href') === '/'));
  assert.ok(links.some((node) => attr(node, 'href') === '/docs/'));
  return tree;
}

test('homepage introduces Bia before benchmarks and keeps the framework API-focused', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const tree = parse(html);
  const sections = findAll(findAll(tree, 'main')[0], 'section');
  const ids = sections.map((node) => attr(node, 'aria-labelledby'));
  assert.ok(ids.indexOf('why') < ids.indexOf('showcase'));
  assert.ok(ids.indexOf('showcase') < ids.indexOf('benchmarks'));
  const showcase = sections.find((node) => attr(node, 'aria-labelledby') === 'showcase');
  assert.equal(textContent(findAll(showcase, 'h2')[0]), 'Built with CrabPHP');
  assert.ok(findAll(showcase, 'a').some((node) => attr(node, 'href') === '/bia/' && textContent(node).startsWith('Meet Bia')));
  assert.ok(findAll(findAll(tree, 'header')[0], 'a').some((node) => attr(node, 'href') === '/bia/'));
  assert.doesNotMatch(textContent(tree), /Build a regular server-rendered website|Views with Arc|web apps, JSON APIs/);
  assert.match(html, /JSON APIs and services/);
  assert.match(await readFile(new URL('../public/_redirects', import.meta.url), 'utf8'), /^\/bia \/bia\/ 301$/m);
});

test('Bia source page contains setup, a labelled example and honest permissions', async () => {
  const tree = checkBiaPage(await readFile(new URL('../bia/index.html', import.meta.url), 'utf8'));
  assert.equal(findAll(tree, 'script').length, 0);
});

test('Vite development redirects /bia and transforms the product page rather than serving raw HTML', async (t) => {
  const server = await createServer({ configFile, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, strictPort: false } });
  t.after(() => server.close());
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const redirect = await fetch(`${base}/bia?from=home`, { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/bia/?from=home');
  const response = await fetch(`${base}/bia/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  checkBiaPage(html);
  assert.match(html, /class="highlights"/);
  assert.match(html, /var\(--code-keyword\)/);
  assert.match(html, /href="\/assets\/crab\.css\?v=[a-f0-9]{10}"/);
});

test('production builds both landing pages and preview serves the Bia page with shared highlighting', async (t) => {
  const outDir = await mkdtemp(join(tmpdir(), 'crab-site-build-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  await build({ configFile, logLevel: 'silent', build: { outDir } });
  const home = await readFile(join(outDir, 'index.html'), 'utf8');
  const bia = await readFile(join(outDir, 'bia/index.html'), 'utf8');
  const tree = checkBiaPage(bia);
  assert.equal(findAll(tree, 'script').length, 0, 'No browser JavaScript is shipped for the product page');
  assert.match(bia, /var\(--code-keyword\)/);
  assert.match(bia, /href="\/assets\/crab\.css\?v=[a-f0-9]{10}"/);
  assert.equal(bia.match(/href="(\/assets\/crab\.css[^\"]+)"/)[1], home.match(/href="(\/assets\/crab\.css[^\"]+)"/)[1]);
  assert.match(home, /class="benchmark-ping"/);
  assert.doesNotMatch(bia, /class="benchmark-ping"/);

  const server = await preview({ configFile, logLevel: 'silent', build: { outDir }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  t.after(() => new Promise((resolve, reject) => {
    server.httpServer.closeAllConnections();
    server.httpServer.close((error) => error ? reject(error) : resolve());
  }));
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const redirect = await fetch(`${base}/bia?from=home`, { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/bia/?from=home');
  const response = await fetch(`${base}/bia/`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), bia);
  const head = await fetch(`${base}/bia/`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
