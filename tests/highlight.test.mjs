import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseFragment } from 'parse5';
import { highlightCode, highlightCodeBlocks } from '../scripts/highlight.mjs';

const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');
const attr = (node, name) => node.attrs.find((attr) => attr.name === name)?.value;
const codeText = (html) => textContent(findAll(parseFragment(html), 'code')[0]);

test('PHP snippets without an opening tag get real syntax colours', () => {
  const source = "// routes/web.php\nuse Crab\\Route;\nRoute::get('/hello', static fn (string $name): array => ['hello' => $name]);";
  const html = highlightCode(source, 'php');
  assert.equal(codeText(html), source);
  assert.match(html, /class="language-php"/);
  for (const token of ['comment', 'keyword', 'function', 'type', 'string', 'variable', 'operator']) {
    assert.ok(html.includes(`var(--code-${token})`), `Missing colour for ${token}`);
  }
});

test('supported documentation languages highlight and preserve source', () => {
  const examples = [
    ['sh', 'php cua start --daemon # start the server'],
    ['json', '{"hello": true, "count": 42}'],
    ['js', 'const hello = "Crab";'],
    ['xml', '<dependency name="crab" />'],
    ['html', '@props(string $title)\n<Layout title="Greeting"><h1>{{ $title }}</h1></Layout>'],
    ['ini', 'APP_DEBUG=true'],
    ['sql', 'SELECT * FROM users WHERE id = 1;'],
    ['nginx', 'server { listen 80; }'],
  ];
  for (const [language, source] of examples) {
    const html = highlightCode(source, language);
    assert.equal(codeText(html), source);
    assert.match(html, /<span style="color:var\(--code-/);
  }
});

test('fence metadata and case-insensitive aliases resolve the language', () => {
  const html = highlightCode('return 42;', 'PHP title="example.php"');
  assert.match(html, /class="language-php"/);
  assert.ok(html.includes('var(--code-keyword)'));
});

test('plain, missing, unsupported, and unsafe language hints fall back safely', () => {
  const source = '<script>alert("x")</script> & &#60;\n  Cua 🦀\n';
  for (const language of ['text', '', 'caddyfile', 'future-language', 'php"onclick="alert(1)']) {
    const html = highlightCode(source, language);
    assert.equal(codeText(html), source);
    assert.ok(!html.includes('<span'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('onclick'));
  }
  assert.equal(codeText(highlightCode('unlabelled')), 'unlabelled');
  assert.equal(codeText(highlightCode('')), '');
});

test('highlighted code escapes HTML and survives the next WASM call', () => {
  const source = "<?php\n// </code></pre><script>alert('x')</script>\nreturn '<div>&hello;</div>';\n";
  const html = highlightCode(source, 'php');
  highlightCode('SELECT 1;', 'sql');
  assert.equal(codeText(html), source);
  assert.equal(findAll(parseFragment(html), 'script').length, 0);
});

test('HTML examples decode entities exactly once and preserve attributes', () => {
  const source = '<pre id="example" class="wide" data-example="php"><code class="language-php extra" aria-label="Example">return &quot;&lt;tag&gt; &amp; &amp;lt; &#39; &#x1F980;&quot;;</code></pre>';
  const html = highlightCodeBlocks(source);
  const tree = parseFragment(html);
  const pre = findAll(tree, 'pre')[0];
  const code = findAll(tree, 'code')[0];
  assert.equal(textContent(code), 'return "<tag> & &lt; \' 🦀";');
  assert.equal(attr(pre, 'id'), 'example');
  assert.equal(attr(pre, 'class'), 'highlights wide');
  assert.equal(attr(pre, 'data-example'), 'php');
  assert.equal(attr(code, 'class'), 'language-php extra');
  assert.equal(attr(code, 'aria-label'), 'Example');
  assert.ok(html.includes('var(--code-keyword)'));
});

test('HTML transform handles several blocks without touching unrelated markup', () => {
  const mascot = '<pre class="mascot" role="img">▙▟<span class="eyes">██</span></pre>';
  const inline = '<p>Inline <code>return 42;</code> stays plain.</p>';
  const untagged = '<pre><code>unlabelled output &amp; text</code></pre>';
  const source = `${mascot}${inline}<pre><code class="language-json">{"count": 42}</code></pre>${untagged}<pre><code class="language-php">return 42;</code></pre>`;
  const html = highlightCodeBlocks(source);
  assert.ok(html.startsWith(mascot + inline));
  assert.ok(html.includes(untagged));
  assert.equal(findAll(parseFragment(html), 'pre').filter((node) => attr(node, 'class') === 'highlights').length, 2);
  assert.deepEqual(findAll(parseFragment(html), 'code').map(textContent), [
    'return 42;', '{"count": 42}', 'unlabelled output & text', 'return 42;',
  ]);
  assert.equal(highlightCodeBlocks(html), html);
});

test('landing-page blocks preserve their text and use declared CSS colours', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/assets/crab.css', import.meta.url), 'utf8');
  const html = highlightCodeBlocks(source);
  const before = findAll(parseFragment(source), 'pre');
  const after = findAll(parseFragment(html), 'pre');
  assert.deepEqual(after.map(textContent), before.map(textContent));
  assert.equal(after.filter((node) => attr(node, 'class')?.includes('highlights')).length, 4);
  assert.ok(html.includes('var(--code-keyword)'));
  assert.match(html, /<pre class="mascot"/);
  for (const [, variable] of html.matchAll(/var\((--code-[a-z-]+)\)/g)) {
    assert.ok(css.includes(`${variable}:`), `Missing CSS variable ${variable}`);
  }
});
