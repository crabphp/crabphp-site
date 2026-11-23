import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'parse5';
import { addTheme } from '../scripts/theme.mjs';

const findAll = (node, tagName) => [
  ...(node.tagName === tagName ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => findAll(child, tagName)),
];
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;

test('landing pages get a head script, a theme-color per scheme and a hidden System/Light/Dark switch', async () => {
  for (const file of ['../index.html', '../bia/index.html']) {
    const tree = parse(addTheme(await readFile(new URL(file, import.meta.url), 'utf8')));
    const head = findAll(tree, 'head')[0];
    assert.equal(findAll(head, 'script').length, 1, 'The theme is applied before first paint');
    assert.deepEqual(findAll(head, 'meta').filter((node) => attr(node, 'name') === 'theme-color').map((node) => attr(node, 'media')), ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
    const group = findAll(findAll(tree, 'footer')[0], 'p').find((node) => attr(node, 'class') === 'theme-switch');
    assert.ok(group && attr(group, 'hidden') === '', 'Hidden until JavaScript runs');
    const buttons = findAll(group, 'button');
    assert.deepEqual(buttons.map((node) => attr(node, 'data-theme-choice')), ['auto', 'light', 'dark']);
    assert.deepEqual(buttons.map((node) => attr(node, 'aria-pressed')), ['true', 'false', 'false'], 'System is the default');
  }
});

test('every colour token has a light and a dark value, and system is the default scheme', async () => {
  const css = await readFile(new URL('../public/assets/crab.css', import.meta.url), 'utf8');
  const root = css.match(/:root \{([^}]+)\}/)[1];
  assert.match(root, /color-scheme: light dark;/);
  for (const line of css.split('\n').filter((line) => /#[0-9a-f]{3,6}\b|rgba\(/i.test(line))) {
    assert.match(line, /light-dark\(/, `Colour without both themes: ${line.trim()}`);
  }
  assert.match(css, /\[data-theme="light"\] \{ color-scheme: light; \}/);
  assert.match(css, /\[data-theme="dark"\] \{ color-scheme: dark; \}/);
});
