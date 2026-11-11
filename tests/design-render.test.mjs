import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { parse } from 'parse5';

const exec = promisify(execFile);
const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'crab-site-design-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['scripts', 'public/assets']) {
    await mkdir(join(root, directory), { recursive: true });
  }
  for (const file of ['design.md', 'scripts/render-design.mjs', 'scripts/page.mjs', 'scripts/highlight.mjs', 'public/assets/crab.css']) {
    await copyFile(new URL(`../${file}`, import.meta.url), join(root, file));
  }
  await symlink(fileURLToPath(new URL('../node_modules', import.meta.url)), join(root, 'node_modules'), 'dir');
  return {
    root,
    render: async () => {
      await exec(process.execPath, [join(root, 'scripts/render-design.mjs')]);
      return readFile(join(root, 'public/design/index.html'), 'utf8');
    },
  };
}

test('design renders the source and live elements using the shared stylesheet, without browser JavaScript', async (t) => {
  const { root, render } = await fixture(t);
  const html = await render();
  const tree = parse(html);
  assert.equal(findAll(tree, 'h1').length, 1);
  assert.equal(textContent(findAll(tree, 'h1')[0]), 'Crab site design system');
  assert.equal(attr(findAll(tree, 'main')[0], 'id'), 'main');
  assert.equal(findAll(tree, 'script').length, 0);
  assert.equal(findAll(tree, 'style').length, 0, 'There is no parallel theme');
  const css = await readFile(join(root, 'public/assets/crab.css'), 'utf8');
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 10);
  assert.deepEqual(findAll(tree, 'link').filter((node) => attr(node, 'rel') === 'stylesheet').map((node) => attr(node, 'href')), [`/assets/crab.css?v=${hash}`]);
  for (const tag of ['blockquote', 'details', 'summary', 'dl', 'ol', 'table', 'code']) {
    assert.ok(findAll(tree, tag).length, `Missing live ${tag} specimen`);
  }
  assert.ok(html.includes('var(--code-keyword)'), 'Uses the real code highlighter');
  const terminal = findAll(tree, 'code').find((node) => attr(node, 'class') === 'language-text');
  assert.equal(textContent(terminal), '$ php cua status\nHTTP       running\nQueue      running\nScheduler  running\n');
  assert.equal(findAll(terminal, 'span').length, 0, 'Terminal output remains plain');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length, 'Heading ids are unique');
  for (const link of findAll(tree, 'a')) {
    const href = attr(link, 'href');
    if (href?.startsWith('#')) assert.ok(ids.includes(href.slice(1)), `Broken section link: ${href}`);
  }
  const footer = findAll(tree, 'footer')[0];
  assert.ok(findAll(footer, 'a').some((node) => attr(node, 'href') === '/design/' && textContent(node) === 'Design'));
  assert.ok(html.includes('href="/content/design.md"'));
  assert.equal(await readFile(join(root, 'public/content/design.md'), 'utf8'), await readFile(join(root, 'design.md'), 'utf8'), 'Published Markdown is the exact source');
  assert.ok(!html.includes('<!-- design:tokens -->'));
});

test('source edits and real CSS token changes are reflected on regeneration', async (t) => {
  const { root, render } = await fixture(t);
  const before = await render();
  const source = await readFile(join(root, 'design.md'), 'utf8');
  const updated = source + '\n## Synced addition\n\nA source-only edit appears on the site.\n';
  await writeFile(join(root, 'design.md'), updated);
  const cssPath = join(root, 'public/assets/crab.css');
  const css = (await readFile(cssPath, 'utf8')).replace('--amber: #f5b800;', '--amber: #f0c000;').replace('--measure: 680px;', '--measure: 700px;');
  await writeFile(cssPath, css);
  const after = await render();
  assert.ok(after.includes('<h2 id="synced-addition">Synced addition</h2>'));
  assert.ok(after.includes('A source-only edit appears on the site.'));
  const table = findAll(parse(after), 'table').find((node) => textContent(node).includes('--amber'));
  assert.ok(textContent(table).includes('--amber#f0c000'));
  assert.ok(textContent(table).includes('--measure700px'));
  assert.ok(!textContent(table).includes('#f5b800'));
  assert.notEqual(before.match(/crab\.css\?v=\w+/)[0], after.match(/crab\.css\?v=\w+/)[0], 'Stylesheet URL changes with the real CSS');
  assert.equal(await readFile(join(root, 'public/content/design.md'), 'utf8'), updated);
});

test('design generation fails rather than silently losing its token preview', async (t) => {
  const { root, render } = await fixture(t);
  await writeFile(join(root, 'design.md'), '# Design\n');
  await assert.rejects(render, /exactly one design:tokens marker/);
});

test('landing footer and development/build scripts keep the design reference discoverable and generated', async () => {
  const landing = parse(await readFile(new URL('../index.html', import.meta.url), 'utf8'));
  assert.ok(findAll(findAll(landing, 'footer')[0], 'a').some((node) => attr(node, 'href') === '/design/' && textContent(node) === 'Design'));
  const { scripts } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of ['dev', 'build']) assert.ok(scripts[name].includes('npm run render:design'));
  assert.match(await readFile(new URL('../public/_redirects', import.meta.url), 'utf8'), /^\/design \/design\/ 301$/m);
});
