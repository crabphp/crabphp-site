import { codeToHtml, isSupportedLanguage } from '@pierre/highlights';
import { parseFragment, serializeOuter } from 'parse5';

// Pierre Dark's syntax colours, with the site's background, text and contrast.
// Named palette entries resolve to CSS variables in crab.css.
const theme = {
  name: 'Crab Dark',
  appearance: 'dark',
  cssVariables: { prefix: '--code-' },
  style: {
    'editor.background': 'background',
    'editor.foreground': 'foreground',
    syntax: {
      comment: 'comment',
      string: 'string',
      'string.escape': 'operator',
      number: 'number',
      constant: 'number',
      boolean: 'number',
      keyword: 'keyword',
      function: 'function',
      type: 'type',
      constructor: 'type',
      variable: 'variable',
      property: 'variable',
      attribute: 'variable',
      tag: 'keyword',
      operator: 'operator',
      punctuation: 'foreground',
    },
  },
};
const decoder = new TextDecoder();

export function highlightCode(source, info = '') {
  const hint = info.trim().split(/\s+/)[0].toLowerCase();
  const language = isSupportedLanguage(hint) ? hint : 'text';
  // Decode immediately: the next call may overwrite the WASM-backed bytes.
  return decoder.decode(codeToHtml(source, { lang: language, theme }))
    .replace('<code>', `<code class="language-${language}">`);
}

const textContent = (node) => node.value ?? (node.childNodes ?? []).map(textContent).join('');

// Only language-tagged pre/code blocks opt in. Parse HTML so entities are decoded
// once, existing attributes survive, and unrelated <pre> elements stay untouched.
export function highlightCodeBlocks(html) {
  const replacements = [];
  const visit = (node) => {
    if (node.tagName === 'pre') {
      if (node.attrs.some(({ name, value }) => name === 'class' && value.split(/\s+/).includes('highlights'))) return;
      const code = node.childNodes?.find((child) => child.tagName === 'code');
      const language = code?.attrs.find(({ name }) => name === 'class')?.value.match(/(?:^|\s)language-(\S+)/)?.[1];
      if (language && node.childNodes.every((child) => child === code || (child.nodeName === '#text' && !child.value.trim()))) {
        const highlighted = parseFragment(highlightCode(textContent(code), language)).childNodes[0];
        for (const attr of node.attrs) {
          const existing = highlighted.attrs.find(({ name }) => name === attr.name);
          if (!existing) highlighted.attrs.push(attr);
          else existing.value += `${attr.name === 'style' ? ';' : ' '}${attr.value}`;
        }
        highlighted.childNodes[0].attrs = code.attrs;
        const { startOffset, endOffset } = node.sourceCodeLocation;
        replacements.push({ startOffset, endOffset, html: serializeOuter(highlighted) });
        return;
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(parseFragment(html, { sourceCodeLocationInfo: true }));
  // Work backwards so the original source offsets remain valid.
  for (const replacement of replacements.reverse()) {
    html = html.slice(0, replacement.startOffset) + replacement.html + html.slice(replacement.endOffset);
  }
  return html;
}
