import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
  const site = join(root, 'site');
  const source = join(root, 'design');
  await mkdir(join(site, 'scripts'), { recursive: true });
  await copyFile(new URL('../scripts/sync-design.mjs', import.meta.url), join(site, 'scripts/sync-design.mjs'));
  const files = {
    'index.html': '<!doctype html><h1>Actual design showcase</h1><link rel="stylesheet" href="css/crab.css"><script type="module" src="demo/demo.js"></script>',
    'design.md': '# Actual design rules\n',
    'LICENSE': 'MIT\n',
    'css/crab.css': '@import "./base.css";\n',
    'css/base.css': '@font-face { src: url("../fonts/test.woff2"); }\n',
    'demo/demo.css': '.demo { display: block; }\n',
    'demo/demo.js': 'import { chart } from "../js/charts.js";\n',
    'fonts/test.woff2': Buffer.from([0, 1, 255, 128, 42]),
    'fonts/OFL.txt': 'Font licence\n',
    'js/charts.js': 'export function chart() {}\n',
  };
  for (const [file, content] of Object.entries({ ...files, '.git/config': 'private git config', 'scripts/dev.mjs': 'dev tools', 'README.md': 'repository readme' })) {
    await mkdir(dirname(join(source, file)), { recursive: true });
    await writeFile(join(source, file), content);
  }
  const env = { ...process.env };
  delete env.CRABPHP_DESIGN_PATH;
  return {
    site, source, files,
    sync: (overrides = {}) => exec(process.execPath, [join(site, 'scripts/sync-design.mjs')], { env: { ...env, ...overrides } }),
  };
}

test('build-time copy publishes the actual sibling design showcase and all assets unchanged', async (t) => {
  const { site, files, sync } = await fixture(t);
  await sync();
  const output = join(site, 'public/design');
  for (const [file, content] of Object.entries(files)) {
    assert.deepEqual(await readFile(join(output, file)), Buffer.from(content), `${file} is copied byte-for-byte`);
  }
  const published = (await readdir(output, { recursive: true })).sort();
  assert.ok(!published.some((file) => file.startsWith('.git') || file.startsWith('scripts') || file === 'README.md'));
  assert.equal(await readFile(join(output, 'index.html'), 'utf8'), files['index.html'], 'No wrapper or recreated preview');
});

test('every copy refreshes changed sources, removes stale assets and cleans up only the former preview Markdown', async (t) => {
  const { site, source, sync } = await fixture(t);
  await sync();
  await writeFile(join(site, 'public/design/css/obsolete.css'), 'stale');
  await mkdir(join(site, 'public/content/docs'), { recursive: true });
  await writeFile(join(site, 'public/content/design.md'), 'former site-only reference');
  await writeFile(join(site, 'public/content/docs/keep.md'), 'unrelated documentation');
  await writeFile(join(source, 'index.html'), '<h1>Updated upstream showcase</h1>');
  await writeFile(join(source, 'css/base.css'), 'updated real stylesheet');
  await sync({ CRABPHP_DESIGN_PATH: '../design' });
  assert.equal(await readFile(join(site, 'public/design/index.html'), 'utf8'), '<h1>Updated upstream showcase</h1>');
  assert.equal(await readFile(join(site, 'public/design/css/base.css'), 'utf8'), 'updated real stylesheet');
  await assert.rejects(readFile(join(site, 'public/design/css/obsolete.css')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(site, 'public/content/design.md')), { code: 'ENOENT' });
  assert.equal(await readFile(join(site, 'public/content/docs/keep.md'), 'utf8'), 'unrelated documentation');
});

test('missing or incomplete design checkouts fail without replacing the existing output', async (t) => {
  const { site, source, files, sync } = await fixture(t);
  await sync({ CRABPHP_DESIGN_PATH: source });
  await assert.rejects(sync({ CRABPHP_DESIGN_PATH: '../missing' }), /Design source is missing or incomplete/);
  await rm(join(source, 'js'), { recursive: true });
  await assert.rejects(sync(), /Design source is missing or incomplete/);
  assert.equal(await readFile(join(site, 'public/design/index.html'), 'utf8'), files['index.html']);
});

test('homepage footer, builds and deployment all use the design repo landing page', async () => {
  const landing = parse(await readFile(new URL('../index.html', import.meta.url), 'utf8'));
  assert.ok(findAll(findAll(landing, 'footer')[0], 'a').some((node) => attr(node, 'href') === '/design/' && textContent(node) === 'Design'));
  const { scripts } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of ['dev', 'build']) {
    assert.ok(scripts[name].includes('npm run sync:design'));
    assert.ok(!scripts[name].includes('render:design'));
  }
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /repository: crabphp\/design/);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /CRABPHP_DESIGN_PATH: \.design-source/);
  assert.match(await readFile(new URL('../public/_redirects', import.meta.url), 'utf8'), /^\/design \/design\/ 301$/m);
});
