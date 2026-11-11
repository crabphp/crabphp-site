import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { parseFragment } from 'parse5';

const exec = promisify(execFile);
const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');

test('documentation renders highlighted blocks without changing source or code-like links', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'crab-site-docs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['scripts', 'public/assets', 'public/content/docs']) {
    await mkdir(join(root, directory), { recursive: true });
  }
  for (const file of ['scripts/render-docs.mjs', 'scripts/page.mjs', 'scripts/highlight.mjs', 'public/assets/crab.css']) {
    await copyFile(new URL(`../${file}`, import.meta.url), join(root, file));
  }
  await symlink(fileURLToPath(new URL('../node_modules', import.meta.url)), join(root, 'node_modules'), 'dir');
  const blocks = [
    ['php', 'return ["hello" => "<Ada>"];'],
    ['html', '<Layout title="Greeting"><h1>Hello, {{ $name }}</h1></Layout>'],
    ['text', 'href="example.md"\n<a href="example.md#introduction">A code sample, not a link</a>'],
    ['unknown-language', '<script>alert("escaped")</script>'],
  ];
  const markdown = '# Example\n\n- [Introduction](#introduction)\n\n## Introduction\n\n[Another section](example.md#introduction)\n\n'
    + blocks.map(([language, source]) => `\`\`\`${language}\n${source}\n\`\`\`\n`).join('\n');
  await writeFile(join(root, 'public/content/docs/documentation.md'), '# Documentation\n\n## Basics\n\n- [Example](example.md)\n');
  await writeFile(join(root, 'public/content/docs/example.md'), markdown);
  await exec(process.execPath, [join(root, 'scripts/render-docs.mjs')]);

  const html = await readFile(join(root, 'public/docs/example/index.html'), 'utf8');
  const tree = parseFragment(html);
  const code = findAll(tree, 'code');
  assert.deepEqual(code.map(textContent), blocks.map(([, source]) => `${source}\n`));
  assert.ok(html.includes('var(--code-keyword)'));
  assert.ok(html.includes('href="/docs/example/#introduction"'));
  assert.equal(findAll(tree, 'script').length, 1, 'Only the existing navigation-collapse script is present');
  assert.equal(findAll(code[2], 'span').length, 0, 'Terminal output is not coloured');
  assert.equal(findAll(code[3], 'span').length, 0, 'Unknown languages stay plain');
  assert.equal(await readFile(join(root, 'public/llms-full.txt'), 'utf8'), `${markdown.trim()}\n`);
  const index = await readFile(join(root, 'public/docs/index.html'), 'utf8');
  for (const page of [html, index]) {
    const footer = findAll(parseFragment(page), 'footer')[0];
    assert.ok(footer, 'Documentation pages share the site footer');
    const design = findAll(footer, 'a').find((node) => node.attrs.some(({ name, value }) => name === 'href' && value === '/design/'));
    assert.equal(textContent(design), 'Design');
  }
  assert.match(await readFile(join(root, 'public/sitemap.xml'), 'utf8'), /\/design\/<\/loc>/);
});
