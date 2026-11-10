import { parseFragment } from 'parse5';

const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');
const hasClass = (node, name) => node.attrs?.some((attr) => attr.name === 'class' && attr.value.split(/\s+/).includes(name));

// Derive motion from the published Hello numbers, including after a benchmark
// refresh. Tracks and the caption note are generated together; no JavaScript
// ships to browsers.
export function addBenchmarkPings(html) {
  const tree = parseFragment(html, { sourceCodeLocationInfo: true });
  const section = findAll(tree, 'section').find((node) => node.attrs.some(({ name, value }) =>
    name === 'aria-labelledby' && value.split(/\s+/).includes('benchmarks')));
  if (!section) return html;

  const rows = findAll(section, 'tbody').flatMap((body) => findAll(body, 'tr')).map((row) => {
    const hello = row.childNodes.find((node) => node.tagName === 'td');
    const value = hello && textContent(hello).trim();
    const throughput = value && /^[\d,]+$/.test(value) ? Number(value.replaceAll(',', '')) : NaN;
    return { hello, throughput };
  }).filter(({ hello, throughput }) => hello?.sourceCodeLocation?.endTag && Number.isFinite(throughput) && throughput > 0);
  if (!rows.length) return html;
  const fastest = Math.max(...rows.map(({ throughput }) => throughput));

  const insertions = rows.filter(({ hello }) => !findAll(hello, 'span').some((span) => hasClass(span, 'benchmark-ping')))
    .map(({ hello, throughput }) => ({
      offset: hello.sourceCodeLocation.endTag.startOffset,
      markup: `<span class="benchmark-ping" style="--hello-duration: ${fastest / throughput}s" aria-hidden="true"><span></span></span>`,
    }));
  const caption = findAll(section, 'caption')[0];
  if (caption?.sourceCodeLocation?.endTag && !findAll(caption, 'span').some((span) => hasClass(span, 'benchmark-explainer'))) {
    insertions.push({
      offset: caption.sourceCodeLocation.endTag.startOffset,
      markup: '<span class="benchmark-explainer">Motion follows Hello.</span>',
    });
  }
  for (const { offset, markup } of insertions.sort((a, b) => b.offset - a.offset)) {
    html = html.slice(0, offset) + markup + html.slice(offset);
  }
  return html;
}
