'use strict';
// Tests d'unité exécutables hors ligne, sans Express/Jest.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, isAllowedPingHost, sanitizePrefs } = require('../src/security');

test('escapeHtml prevents raw script tags', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});
test('escapeHtml encodes all five special characters', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});
test('allowlisted DNS host accepted', () => {
  assert.equal(isAllowedPingHost('google.com'), true);
});
test('shell metacharacters rejected', () => {
  assert.equal(isAllowedPingHost('google.com;echo INJECTED'), false);
});
test('internal IP rejected', () => {
  assert.equal(isAllowedPingHost('169.254.169.254'), false);
});
test('object does not pollute any prototypes', () => {
  const prefs = sanitizePrefs(JSON.parse('{"__proto__":{"admin":true},"theme":"dark"}'));
  assert.deepEqual(prefs, { theme: 'dark', lang: 'fr' });
  assert.equal(({}).admin, undefined);
});
test('invalid preference values ignored', () => {
  assert.deepEqual(sanitizePrefs({ theme: 'red', lang: 4 }), { theme: 'light', lang: 'fr' });
});
