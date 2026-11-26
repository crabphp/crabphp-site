import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addAnalytics, GTM_ID } from '../scripts/analytics.mjs';
import config from '../vite.config.js';

test('the tag goes into the head once', () => {
  const html = addAnalytics(addAnalytics('<html><head><title>x</title></head><body></body></html>'));
  assert.equal(html.split(`gtm.js?id=${GTM_ID}`).length, 2);
  assert.ok(html.indexOf('gtm.js') < html.indexOf('</head>'));
});

test('only the production build adds it', () => {
  const plugin = config.plugins.find((p) => p.name === 'analytics');
  assert.equal(plugin.apply, 'build');
});
