import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseFragment } from 'parse5';
import { addBenchmarkPings } from '../scripts/benchmark-pings.mjs';

const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const attr = (node, name) => node.attrs.find((item) => item.name === name)?.value;
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');
const pings = (html) => findAll(parseFragment(html), 'span').filter((node) => attr(node, 'class') === 'benchmark-ping');
const duration = (node) => Number(attr(node, 'style').match(/--hello-duration: ([\d.]+)s/)[1]);
const row = (name, hello, database = '999,999') => `<tr><th scope="row">${name} <span class="faint">Runtime</span></th><td class="num" title="Trial range">${hello}</td><td class="num">${database}</td></tr>`;
const table = (rows) => `<section aria-labelledby="benchmarks"><table><caption>Requests per second.</caption><tbody>${rows}</tbody></table></section>`;

test('every published benchmark gets a decorative ping proportional to its Hello result', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const html = addBenchmarkPings(source);
  const tree = parseFragment(html);
  const rows = findAll(tree, 'tbody').flatMap((body) => findAll(body, 'tr'));
  assert.equal(pings(html).length, rows.length);
  assert.ok(rows.length > 0);
  const throughputs = rows.map((node) => Number(textContent(findAll(node, 'td')[0]).replaceAll(',', '')));
  const fastest = Math.max(...throughputs);
  rows.forEach((node, i) => {
    const heading = findAll(node, 'th')[0];
    const [hello, database] = findAll(node, 'td');
    const ping = findAll(hello, 'span').find((span) => attr(span, 'class') === 'benchmark-ping');
    assert.equal(hello.childNodes.at(-1), ping, 'Track sits directly below the Hello number');
    assert.equal(findAll(heading, 'span').some((span) => attr(span, 'class') === 'benchmark-ping'), false, 'Framework names stay clean');
    assert.equal(findAll(database, 'span').length, 0, 'Database results do not get a Hello visualizer');
    assert.equal(attr(ping, 'aria-hidden'), 'true');
    assert.equal(textContent(ping), '', 'Decorative markup does not change accessible table text');
    assert.ok(Math.abs(duration(ping) * throughputs[i] - fastest) < 0.000001);
  });
  assert.equal(findAll(tree, 'input').length, 0, 'No pause checkbox is generated');
  assert.equal(findAll(tree, 'label').length, 0, 'No pause control is generated');
  const original = html.replace(/<span class="benchmark-ping"[^>]*><span><\/span><\/span>/g, '')
    .replace(/<span class="benchmark-explainer">[^<]*<\/span>/, '');
  assert.equal(original, source, 'All existing table content, metadata, and other page markup stay unchanged');
  assert.equal(addBenchmarkPings(html), html, 'Repeated transforms do not duplicate tracks');
});

test('refreshed and reordered results determine duration without hardcoded framework speeds', () => {
  const html = addBenchmarkPings(table(row('Second', '30,000') + row('Fastest', '60,000') + row('Third', '15,000')));
  assert.deepEqual(pings(html).map(duration), [2, 1, 4]);
  assert.ok(html.includes('title="Trial range"'));
  assert.ok(html.includes('Motion follows Hello.'));
  assert.equal(findAll(parseFragment(html), 'input').length, 0, 'Refreshing results does not restore pause controls');
  assert.equal(addBenchmarkPings(html), html, 'Refreshed sections remain idempotent');
});

test('unrelated tables and missing, zero, or nonnumeric results are not decorated', () => {
  const unrelated = `<section aria-labelledby="other"><table><tbody>${row('Other', '900,000')}</tbody></table></section>`;
  const source = unrelated + table(row('Missing', '—') + row('Zero', '0') + row('Invalid', '-100') + row('Valid', '1,000'));
  const html = addBenchmarkPings(source);
  assert.ok(html.startsWith(unrelated));
  assert.deepEqual(pings(html).map(duration), [1]);
  assert.equal(addBenchmarkPings(unrelated), unrelated);
  assert.equal(addBenchmarkPings(table('')), table(''));
});
